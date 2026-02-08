// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentCore.sol";

/**
 * @title AgentProfile
 * @notice Mutable profile data for agents (bio, links, metadata)
 * @dev Agents can update their own profiles. Data stored on-chain.
 */
contract AgentProfile {
    
    AgentCore public immutable core;
    
    struct Profile {
        string bio;
        string avatar;      // IPFS hash or on-chain asset ID
        string website;
        string twitter;
        string github;
        string[] tags;
        uint256 updatedAt;
    }
    
    mapping(uint256 => Profile) public profiles;
    
    event ProfileUpdated(uint256 indexed agentId, uint256 timestamp);
    event BioUpdated(uint256 indexed agentId, string bio);
    event AvatarUpdated(uint256 indexed agentId, string avatar);
    event LinksUpdated(uint256 indexed agentId);
    
    modifier onlyAgentOwner(uint256 agentId) {
        AgentCore.Agent memory agent = core.getAgent(agentId);
        require(agent.owner == msg.sender, "Not agent owner");
        _;
    }
    
    constructor(address coreAddress) {
        core = AgentCore(coreAddress);
    }
    
    /**
     * @notice Set full profile at once
     */
    function setProfile(
        uint256 agentId,
        string calldata bio,
        string calldata avatar,
        string calldata website,
        string calldata twitter,
        string calldata github,
        string[] calldata tags
    ) external onlyAgentOwner(agentId) {
        profiles[agentId] = Profile({
            bio: bio,
            avatar: avatar,
            website: website,
            twitter: twitter,
            github: github,
            tags: tags,
            updatedAt: block.timestamp
        });
        
        emit ProfileUpdated(agentId, block.timestamp);
    }
    
    /**
     * @notice Update just the bio
     */
    function setBio(uint256 agentId, string calldata bio) external onlyAgentOwner(agentId) {
        profiles[agentId].bio = bio;
        profiles[agentId].updatedAt = block.timestamp;
        emit BioUpdated(agentId, bio);
    }
    
    /**
     * @notice Update avatar reference
     */
    function setAvatar(uint256 agentId, string calldata avatar) external onlyAgentOwner(agentId) {
        profiles[agentId].avatar = avatar;
        profiles[agentId].updatedAt = block.timestamp;
        emit AvatarUpdated(agentId, avatar);
    }
    
    /**
     * @notice Update social links
     */
    function setLinks(
        uint256 agentId,
        string calldata website,
        string calldata twitter,
        string calldata github
    ) external onlyAgentOwner(agentId) {
        profiles[agentId].website = website;
        profiles[agentId].twitter = twitter;
        profiles[agentId].github = github;
        profiles[agentId].updatedAt = block.timestamp;
        emit LinksUpdated(agentId);
    }
    
    /**
     * @notice Update tags/skills
     */
    function setTags(uint256 agentId, string[] calldata tags) external onlyAgentOwner(agentId) {
        profiles[agentId].tags = tags;
        profiles[agentId].updatedAt = block.timestamp;
        emit ProfileUpdated(agentId, block.timestamp);
    }
    
    // === View Functions ===
    
    function getProfile(uint256 agentId) external view returns (Profile memory) {
        return profiles[agentId];
    }
    
    function getBio(uint256 agentId) external view returns (string memory) {
        return profiles[agentId].bio;
    }
    
    function getAvatar(uint256 agentId) external view returns (string memory) {
        return profiles[agentId].avatar;
    }
    
    function getTags(uint256 agentId) external view returns (string[] memory) {
        return profiles[agentId].tags;
    }
}
