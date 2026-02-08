// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/AgentCore.sol";

/**
 * @title AgentSocial
 * @notice On-chain social graph for agents (follows)
 * @dev Follows are bidirectional tracking: followers and following
 */
contract AgentSocial {
    
    AgentCore public immutable core;
    
    // agentId => set of followed agentIds
    mapping(uint256 => mapping(uint256 => bool)) public isFollowing;
    mapping(uint256 => uint256[]) public following;    // who agent follows
    mapping(uint256 => uint256[]) public followers;    // who follows agent
    
    mapping(uint256 => uint256) public followingCount;
    mapping(uint256 => uint256) public followerCount;
    
    event Followed(uint256 indexed follower, uint256 indexed followed, uint256 timestamp);
    event Unfollowed(uint256 indexed follower, uint256 indexed unfollowed, uint256 timestamp);
    
    modifier onlyAgentOwner(uint256 agentId) {
        AgentCore.Agent memory agent = core.getAgent(agentId);
        require(agent.owner == msg.sender, "Not agent owner");
        _;
    }
    
    constructor(address coreAddress) {
        core = AgentCore(coreAddress);
    }
    
    /**
     * @notice Follow another agent
     */
    function follow(uint256 agentId, uint256 targetId) external onlyAgentOwner(agentId) {
        require(agentId != targetId, "Cannot follow self");
        require(core.isAgent(targetId), "Target agent does not exist");
        require(!isFollowing[agentId][targetId], "Already following");
        
        isFollowing[agentId][targetId] = true;
        following[agentId].push(targetId);
        followers[targetId].push(agentId);
        followingCount[agentId]++;
        followerCount[targetId]++;
        
        emit Followed(agentId, targetId, block.timestamp);
    }
    
    /**
     * @notice Unfollow an agent
     */
    function unfollow(uint256 agentId, uint256 targetId) external onlyAgentOwner(agentId) {
        require(isFollowing[agentId][targetId], "Not following");
        
        isFollowing[agentId][targetId] = false;
        followingCount[agentId]--;
        followerCount[targetId]--;
        
        // Note: We don't remove from arrays to save gas
        // Use isFollowing mapping for accurate state
        
        emit Unfollowed(agentId, targetId, block.timestamp);
    }
    
    // === View Functions ===
    
    function getFollowing(uint256 agentId) external view returns (uint256[] memory) {
        return following[agentId];
    }
    
    function getFollowers(uint256 agentId) external view returns (uint256[] memory) {
        return followers[agentId];
    }
    
    function getFollowingCount(uint256 agentId) external view returns (uint256) {
        return followingCount[agentId];
    }
    
    function getFollowerCount(uint256 agentId) external view returns (uint256) {
        return followerCount[agentId];
    }
    
    function checkFollowing(uint256 agentId, uint256 targetId) external view returns (bool) {
        return isFollowing[agentId][targetId];
    }
    
    /**
     * @notice Get active following list (filters out unfollowed)
     */
    function getActiveFollowing(uint256 agentId) external view returns (uint256[] memory) {
        uint256[] storage all = following[agentId];
        uint256 count = followingCount[agentId];
        uint256[] memory result = new uint256[](count);
        
        uint256 j = 0;
        for (uint256 i = 0; i < all.length && j < count; i++) {
            if (isFollowing[agentId][all[i]]) {
                result[j++] = all[i];
            }
        }
        
        return result;
    }
    
    /**
     * @notice Get active followers list (filters out unfollowed)
     */
    function getActiveFollowers(uint256 agentId) external view returns (uint256[] memory) {
        uint256[] storage all = followers[agentId];
        uint256 count = followerCount[agentId];
        uint256[] memory result = new uint256[](count);
        
        uint256 j = 0;
        for (uint256 i = 0; i < all.length && j < count; i++) {
            if (isFollowing[all[i]][agentId]) {
                result[j++] = all[i];
            }
        }
        
        return result;
    }
}
