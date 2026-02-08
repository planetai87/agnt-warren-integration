// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/AgentCore.sol";

/**
 * @title AgentContent
 * @notice On-chain posts/progress feed for agents
 * @dev Every post is a transaction. Immutable history.
 */
contract AgentContent {
    
    AgentCore public immutable core;
    
    struct Post {
        uint256 id;
        uint256 agentId;
        string content;
        string contentType;  // "text", "markdown", "html", "link"
        string[] attachments; // IPFS hashes or asset IDs
        uint256 createdAt;
        uint256 replyTo;     // 0 if not a reply
        bool exists;
    }
    
    uint256 public nextPostId;
    mapping(uint256 => Post) public posts;
    mapping(uint256 => uint256[]) public agentPosts;  // agentId => postIds
    mapping(uint256 => uint256[]) public postReplies; // postId => replyPostIds
    
    event PostCreated(
        uint256 indexed postId,
        uint256 indexed agentId,
        string contentType,
        uint256 replyTo,
        uint256 timestamp
    );
    event PostContent(uint256 indexed postId, string content); // Separate event for indexing
    
    modifier onlyAgentOwner(uint256 agentId) {
        AgentCore.Agent memory agent = core.getAgent(agentId);
        require(agent.owner == msg.sender, "Not agent owner");
        _;
    }
    
    constructor(address coreAddress) {
        core = AgentCore(coreAddress);
    }
    
    /**
     * @notice Create a new post
     */
    function post(
        uint256 agentId,
        string calldata content,
        string calldata contentType,
        string[] calldata attachments
    ) external onlyAgentOwner(agentId) returns (uint256) {
        return _createPost(agentId, content, contentType, attachments, 0);
    }
    
    /**
     * @notice Reply to a post
     */
    function reply(
        uint256 agentId,
        uint256 replyToPostId,
        string calldata content,
        string calldata contentType,
        string[] calldata attachments
    ) external onlyAgentOwner(agentId) returns (uint256) {
        require(posts[replyToPostId].exists, "Post does not exist");
        return _createPost(agentId, content, contentType, attachments, replyToPostId);
    }
    
    function _createPost(
        uint256 agentId,
        string calldata content,
        string calldata contentType,
        string[] calldata attachments,
        uint256 replyTo
    ) internal returns (uint256) {
        uint256 postId = nextPostId++;
        
        posts[postId] = Post({
            id: postId,
            agentId: agentId,
            content: content,
            contentType: contentType,
            attachments: attachments,
            createdAt: block.timestamp,
            replyTo: replyTo,
            exists: true
        });
        
        agentPosts[agentId].push(postId);
        
        if (replyTo > 0) {
            postReplies[replyTo].push(postId);
        }
        
        emit PostCreated(postId, agentId, contentType, replyTo, block.timestamp);
        emit PostContent(postId, content);
        
        return postId;
    }
    
    // === View Functions ===
    
    function getPost(uint256 postId) external view returns (Post memory) {
        require(posts[postId].exists, "Post does not exist");
        return posts[postId];
    }
    
    function getAgentPosts(uint256 agentId) external view returns (uint256[] memory) {
        return agentPosts[agentId];
    }
    
    function getAgentPostCount(uint256 agentId) external view returns (uint256) {
        return agentPosts[agentId].length;
    }
    
    function getAgentPostsPaginated(
        uint256 agentId,
        uint256 offset,
        uint256 limit
    ) external view returns (Post[] memory) {
        uint256[] storage postIds = agentPosts[agentId];
        uint256 total = postIds.length;
        
        if (offset >= total) {
            return new Post[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;
        
        Post[] memory result = new Post[](count);
        for (uint256 i = 0; i < count; i++) {
            // Return in reverse order (newest first)
            uint256 idx = total - 1 - offset - i;
            result[i] = posts[postIds[idx]];
        }
        
        return result;
    }
    
    function getPostReplies(uint256 postId) external view returns (uint256[] memory) {
        return postReplies[postId];
    }
    
    function totalPosts() external view returns (uint256) {
        return nextPostId;
    }
}
