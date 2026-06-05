// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PaymentRouter {
    event PaymentReceived(
        address indexed from,
        address indexed merchant,
        uint256 amount,
        string memo,
        uint256 timestamp
    );

    // Make the contract able to receive funds directly, though pay() is preferred
    receive() external payable {}
    
    // Fallback function
    fallback() external payable {}

    function pay(address merchant, string calldata memo) external payable {
        require(msg.value > 0, "No payment amount provided");
        require(merchant != address(0), "Invalid merchant address");
        
        // On Arc, msg.value is denominated in USDC (native gas token)
        (bool success, ) = merchant.call{value: msg.value}("");
        require(success, "Transfer to merchant failed");
        
        emit PaymentReceived(msg.sender, merchant, msg.value, memo, block.timestamp);
    }
}
