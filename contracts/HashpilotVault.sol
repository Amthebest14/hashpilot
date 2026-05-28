// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HashpilotVault
 * @dev A smart contract vault to securely collect and manage protocol revenue (Premium Tool fees).
 */
contract HashpilotVault {
    address public immutable owner;

    // Event emitted when native HBAR is received
    event PaymentReceived(address indexed sender, uint256 amount);

    /**
     * @dev Sets the deployer as the immutable owner of the contract.
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Modifier to restrict functions to the contract owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "HashpilotVault: caller is not the owner");
        _;
    }

    /**
     * @dev Fallback function to accept native HBAR natively.
     */
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    /**
     * @dev Allows the owner to withdraw a specified amount of HBAR.
     * @param amount The amount of tinybars to withdraw.
     */
    function withdrawHBAR(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "HashpilotVault: insufficient balance");
        
        (bool success, ) = owner.call{value: amount}("");
        require(success, "HashpilotVault: transfer failed");
    }

    /**
     * @dev Returns the current HBAR balance of the vault.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
