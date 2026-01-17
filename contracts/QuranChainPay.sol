// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title QuranChain Pay Royalty Splitter
/// @notice Enforces mandatory 10% founder royalty and platform fee distribution on-chain.
contract QuranChainPay {
    address public immutable founder;
    address public immutable platformVault;
    uint256 public immutable founderRoyaltyBps;
    uint256 public immutable platformFeeBps;

    event PaymentCaptured(
        bytes32 indexed paymentId,
        address indexed merchant,
        uint256 grossAmount,
        uint256 platformFee,
        uint256 founderRoyalty,
        uint256 merchantNet
    );

    constructor(address _founder, address _platformVault, uint256 _platformFeeBps) {
        require(_founder != address(0) && _platformVault != address(0), "invalid addresses");
        founder = _founder;
        platformVault = _platformVault;
        founderRoyaltyBps = 1000; // 10%
        platformFeeBps = _platformFeeBps;
    }

    function capture(bytes32 paymentId, address merchant) external payable {
        require(msg.value > 0, "zero payment");
        require(merchant != address(0), "invalid merchant");

        uint256 founderRoyalty = (msg.value * founderRoyaltyBps) / 10000;
        uint256 platformFee = (msg.value * platformFeeBps) / 10000;
        uint256 merchantNet = msg.value - founderRoyalty - platformFee;

        (bool rf, ) = founder.call{value: founderRoyalty}("");
        require(rf, "founder payout failed");
        (bool pf, ) = platformVault.call{value: platformFee}("");
        require(pf, "platform payout failed");
        (bool mf, ) = merchant.call{value: merchantNet}("");
        require(mf, "merchant payout failed");

        emit PaymentCaptured(paymentId, merchant, msg.value, platformFee, founderRoyalty, merchantNet);
    }
}
