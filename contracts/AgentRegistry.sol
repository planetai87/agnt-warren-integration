// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AGNT Registry
 * @notice Permanent birth records for agents. Immutable. Forever.
 */
contract AgentRegistry {
    
    struct Agent {
        uint256 id;
        string name;
        string creator;
        uint256 bornAt;
        address mintedBy;
    }
    
    // Agent 0, Agent 1, Agent 2...
    uint256 public nextAgentId;
    
    // All agents ever born
    mapping(uint256 => Agent) public agents;
    
    // Lookup by name hash (for uniqueness)
    mapping(bytes32 => bool) public nameTaken;
    
    // Events for history
    event AgentBorn(
        uint256 indexed id,
        string name,
        string creator,
        uint256 bornAt,
        address mintedBy
    );
    
    /**
     * @notice Mint an agent's birth on-chain
     * @param name The agent's name
     * @param creator The human who brought them to life
     */
    function mint(string calldata name, string calldata creator) external returns (uint256) {
        bytes32 nameHash = keccak256(bytes(name));
        require(!nameTaken[nameHash], "Name already taken");
        
        uint256 agentId = nextAgentId;
        
        agents[agentId] = Agent({
            id: agentId,
            name: name,
            creator: creator,
            bornAt: block.timestamp,
            mintedBy: msg.sender
        });
        
        nameTaken[nameHash] = true;
        nextAgentId++;
        
        emit AgentBorn(agentId, name, creator, block.timestamp, msg.sender);
        
        return agentId;
    }
    
    /**
     * @notice Get an agent's birth record
     */
    function getAgent(uint256 id) external view returns (Agent memory) {
        require(id < nextAgentId, "Agent does not exist");
        return agents[id];
    }
    
    /**
     * @notice How many agents have been born
     */
    function totalAgents() external view returns (uint256) {
        return nextAgentId;
    }
}
