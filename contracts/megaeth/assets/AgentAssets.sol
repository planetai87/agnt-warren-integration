// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/AgentCore.sol";

/**
 * @title AgentAssets
 * @notice On-chain asset storage for agents using SSTORE2
 * @dev Stores PFPs and other binary data directly on-chain
 */
contract AgentAssets {
    
    AgentCore public immutable core;
    
    struct Asset {
        uint256 id;
        uint256 agentId;
        string name;
        string mimeType;      // "image/png", "image/svg+xml", etc.
        address[] chunks;     // SSTORE2 data contract addresses
        uint256 totalSize;
        uint256 createdAt;
        bool exists;
    }
    
    uint256 public nextAssetId;
    mapping(uint256 => Asset) public assets;
    mapping(uint256 => uint256[]) public agentAssets;  // agentId => assetIds
    mapping(uint256 => uint256) public agentPrimaryPfp; // agentId => assetId (0 = none)
    
    event AssetCreated(uint256 indexed assetId, uint256 indexed agentId, string name, string mimeType, uint256 size);
    event PrimaryPfpSet(uint256 indexed agentId, uint256 indexed assetId);
    
    modifier onlyAgentOwner(uint256 agentId) {
        AgentCore.Agent memory agent = core.getAgent(agentId);
        require(agent.owner == msg.sender, "Not agent owner");
        _;
    }
    
    constructor(address coreAddress) {
        core = AgentCore(coreAddress);
    }
    
    /**
     * @notice Store an asset on-chain using SSTORE2
     * @param agentId The agent who owns this asset
     * @param name Asset name (e.g., "pfp-v1")
     * @param mimeType MIME type (e.g., "image/png")
     * @param data Raw bytes of the asset
     */
    function storeAsset(
        uint256 agentId,
        string calldata name,
        string calldata mimeType,
        bytes calldata data
    ) external onlyAgentOwner(agentId) returns (uint256) {
        uint256 assetId = nextAssetId++;
        
        // Store data using SSTORE2 pattern
        // Split into 24KB chunks (max contract size - 1KB buffer)
        uint256 chunkSize = 24000;
        uint256 numChunks = (data.length + chunkSize - 1) / chunkSize;
        address[] memory chunks = new address[](numChunks);
        
        for (uint256 i = 0; i < numChunks; i++) {
            uint256 start = i * chunkSize;
            uint256 end = start + chunkSize;
            if (end > data.length) end = data.length;
            
            bytes memory chunk = data[start:end];
            chunks[i] = _sstore2Write(chunk);
        }
        
        assets[assetId] = Asset({
            id: assetId,
            agentId: agentId,
            name: name,
            mimeType: mimeType,
            chunks: chunks,
            totalSize: data.length,
            createdAt: block.timestamp,
            exists: true
        });
        
        agentAssets[agentId].push(assetId);
        
        emit AssetCreated(assetId, agentId, name, mimeType, data.length);
        
        return assetId;
    }
    
    /**
     * @notice Set an asset as the agent's primary PFP
     */
    function setPrimaryPfp(uint256 agentId, uint256 assetId) external onlyAgentOwner(agentId) {
        require(assets[assetId].exists, "Asset does not exist");
        require(assets[assetId].agentId == agentId, "Not agent's asset");
        
        agentPrimaryPfp[agentId] = assetId;
        emit PrimaryPfpSet(agentId, assetId);
    }
    
    // === SSTORE2 Implementation ===
    
    /**
     * @notice Write data to a new contract using SSTORE2 pattern
     */
    function _sstore2Write(bytes memory data) internal returns (address) {
        // Prepend STOP opcode so contract can't be called
        bytes memory code = abi.encodePacked(hex"00", data);
        
        address pointer;
        assembly {
            pointer := create(0, add(code, 32), mload(code))
        }
        require(pointer != address(0), "SSTORE2: deployment failed");
        
        return pointer;
    }
    
    /**
     * @notice Read data from an SSTORE2 contract
     */
    function _sstore2Read(address pointer) internal view returns (bytes memory) {
        uint256 size;
        assembly {
            size := extcodesize(pointer)
        }
        
        if (size <= 1) return "";
        
        bytes memory data = new bytes(size - 1);
        assembly {
            extcodecopy(pointer, add(data, 32), 1, sub(size, 1))
        }
        
        return data;
    }
    
    // === View Functions ===
    
    function getAsset(uint256 assetId) external view returns (Asset memory) {
        require(assets[assetId].exists, "Asset does not exist");
        return assets[assetId];
    }
    
    function getAssetData(uint256 assetId) external view returns (bytes memory) {
        Asset storage asset = assets[assetId];
        require(asset.exists, "Asset does not exist");
        
        bytes memory result = new bytes(asset.totalSize);
        uint256 offset = 0;
        
        for (uint256 i = 0; i < asset.chunks.length; i++) {
            bytes memory chunk = _sstore2Read(asset.chunks[i]);
            for (uint256 j = 0; j < chunk.length; j++) {
                result[offset++] = chunk[j];
            }
        }
        
        return result;
    }
    
    function getAgentAssets(uint256 agentId) external view returns (uint256[] memory) {
        return agentAssets[agentId];
    }
    
    function getPrimaryPfp(uint256 agentId) external view returns (uint256) {
        return agentPrimaryPfp[agentId];
    }
    
    function getPrimaryPfpData(uint256 agentId) external view returns (bytes memory, string memory) {
        uint256 assetId = agentPrimaryPfp[agentId];
        if (assetId == 0 || !assets[assetId].exists) {
            return ("", "");
        }
        
        Asset storage asset = assets[assetId];
        bytes memory data = this.getAssetData(assetId);
        return (data, asset.mimeType);
    }
}
