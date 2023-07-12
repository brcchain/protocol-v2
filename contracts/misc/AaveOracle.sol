// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

import {Ownable} from '../dependencies/openzeppelin/contracts/Ownable.sol';
import {IERC20} from '../dependencies/openzeppelin/contracts/IERC20.sol';

import {SafeERC20} from '../dependencies/openzeppelin/contracts/SafeERC20.sol';

/// @title AaveOracle
/// @author Aave
/// @notice Proxy smart contract to get the price of an asset from a price source, with Chainlink Aggregator
///         smart contracts as primary option
/// - If the returned price by a Chainlink aggregator is <= 0, the call is forwarded to a fallbackOracle
/// - Owned by the Aave governance system, allowed to add sources for assets, replace them
///   and change the fallbackOracle
contract AaveOracle is Ownable {
  using SafeERC20 for IERC20;

  event BaseCurrencySet(address indexed baseCurrency, uint256 baseCurrencyUnit);
  event AssetPriceUpdated(address _asset, uint256 _price, uint256 timestamp);

  mapping(address => uint256) private prices;
  address public immutable BASE_CURRENCY;
  uint256 public immutable BASE_CURRENCY_UNIT;

  /// @notice Constructor
  /// @param baseCurrency the base currency used for the price quotes. If USD is used, base currency is 0x0
  /// @param baseCurrencyUnit the unit of the base currency
  constructor(address baseCurrency, uint256 baseCurrencyUnit) public {
    BASE_CURRENCY = baseCurrency;
    BASE_CURRENCY_UNIT = baseCurrencyUnit;
    emit BaseCurrencySet(baseCurrency, baseCurrencyUnit);
  }

  /// @notice Gets an asset price by address
  /// @param asset The asset address
  function getAssetPrice(address asset) public view returns (uint256) {
    if (asset == BASE_CURRENCY) {
      return BASE_CURRENCY_UNIT;
    }
    return prices[asset];
  }

  function setAssetPrice(address _asset, uint256 _price) external onlyOwner {
    prices[_asset] = _price;
    emit AssetPriceUpdated(_asset, _price, block.timestamp);
  }

  /// @notice Gets a list of prices from a list of assets addresses
  /// @param assets The list of assets addresses
  function getAssetsPrices(address[] calldata assets) external view returns (uint256[] memory) {
    uint256[] memory prices = new uint256[](assets.length);
    for (uint256 i = 0; i < assets.length; i++) {
      prices[i] = getAssetPrice(assets[i]);
    }
    return prices;
  }
}
