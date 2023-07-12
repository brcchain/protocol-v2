const { Signer } = require('ethers');
const { ethers } = require('hardhat');
const { network } = require('hardhat');

async function main() {
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const [deployer, alice, bob] = await ethers.getSigners();
  console.log(deployer.address);
  const lendingPoolAddressesProviderRegistryFactory = await hre.ethers.getContractFactory(
    'LendingPoolAddressesProviderRegistry'
  );
  console.log(network.name);
  const lendingPoolAddressesProviderRegistry =
    await lendingPoolAddressesProviderRegistryFactory.deploy();
  await lendingPoolAddressesProviderRegistry.deployed();
  console.log(
    'lendingPoolAddressesProviderRegistry deployed to:',
    lendingPoolAddressesProviderRegistry.address
  );

  const lendingPoolAddressesProviderFactory = await hre.ethers.getContractFactory(
    'LendingPoolAddressesProvider'
  );
  const lendingPoolAddressesProvider = await lendingPoolAddressesProviderFactory.deploy(
    'Aave genesis market'
  );
  await lendingPoolAddressesProvider.deployed();
  console.log('lendingPoolAddressesProvider deployed to:', lendingPoolAddressesProvider.address);

  await lendingPoolAddressesProviderRegistry.registerAddressesProvider(
    lendingPoolAddressesProvider.address,
    1
  );
  await lendingPoolAddressesProvider.setPoolAdmin(deployer.address);
  await lendingPoolAddressesProvider.setEmergencyAdmin(deployer.address);

  const LibReserveLogic = await ethers.getContractFactory('ReserveLogic');
  const libReserveLogic = await LibReserveLogic.deploy();
  await libReserveLogic.deployed();

  const LibGenericLogic = await ethers.getContractFactory('GenericLogic');
  const libGenericLogic = await LibGenericLogic.deploy();
  await libGenericLogic.deployed();

  const LibValidationLogic = await ethers.getContractFactory('ValidationLogic', {
    signer: deployer,
    libraries: {
      GenericLogic: libGenericLogic.address,
    },
  });
  const libValidationLogic = await LibValidationLogic.deploy();
  await libValidationLogic.deployed();

  const lendingPoolFactory = await hre.ethers.getContractFactory('LendingPool', {
    signer: deployer,
    libraries: {
      ReserveLogic: libReserveLogic.address,
      ValidationLogic: libValidationLogic.address,
    },
  });

  const lendingPool = await lendingPoolFactory.deploy();
  await lendingPool.deployed();
  await lendingPool.initialize(lendingPoolAddressesProvider.address);
  await lendingPoolAddressesProvider.setLendingPoolImpl(lendingPool.address);
  console.log('lendingPool deployed to:', lendingPool.address);

  const lendingPoolConfiguratorFactory = await hre.ethers.getContractFactory(
    'LendingPoolConfigurator'
  );
  const lendingPoolConfigurator = await lendingPoolConfiguratorFactory.deploy();
  await lendingPoolConfigurator.deployed();

  //   console.log(await lendingPoolAddressesProvider.getLendingPoolConfigurator());
  await lendingPoolAddressesProvider.setLendingPoolConfiguratorImpl(
    lendingPoolConfigurator.address
  );
  //   console.log(await lendingPoolAddressesProvider.getLendingPoolConfigurator());
  await lendingPoolConfigurator.initialize(lendingPoolAddressesProvider.address);
  const proxyLendingPoolConfiguratorAddress =
    await lendingPoolAddressesProvider.getLendingPoolConfigurator();
  const proxyLendingPoolConfigurator = await lendingPoolConfiguratorFactory.attach(
    proxyLendingPoolConfiguratorAddress
  );
  //   console.log('lendingPoolConfigurator deployed to:', lendingPoolConfigurator.address);

  const stableAndVariableTokensHelperFactory = await hre.ethers.getContractFactory(
    'StableAndVariableTokensHelper'
  );
  const stableAndVariableTokensHelper = await stableAndVariableTokensHelperFactory.deploy(
    lendingPool.address,
    lendingPoolAddressesProvider.address
  );
  await stableAndVariableTokensHelper.deployed();
  console.log('stableAndVariableTokensHelper deployed to:', stableAndVariableTokensHelper.address);

  const aTokensAndRatesHelperFactory = await hre.ethers.getContractFactory('ATokensAndRatesHelper');
  const aTokensAndRatesHelper = await aTokensAndRatesHelperFactory.deploy(
    lendingPool.address,
    lendingPoolAddressesProvider.address,
    lendingPoolConfigurator.address
  );
  await aTokensAndRatesHelper.deployed();
  console.log('aTokensAndRatesHelper deployed to:', aTokensAndRatesHelper.address);

  const aaveOracleFactory = await hre.ethers.getContractFactory('AaveOracle');
  const aaveOracle = await aaveOracleFactory.deploy(
    '0x753D2AE4808069D2f29Ec5CDF0881D985CAEf26b',
    BigInt(1e18)
  );
  await aaveOracle.deployed();
  await lendingPoolAddressesProvider.setPriceOracle(aaveOracle.address);
  console.log('aaveOracle deployed to:', aaveOracle.address);

  const lendingRateOracleFactory = await hre.ethers.getContractFactory('LendingRateOracle');
  const lendingRateOracle = await lendingRateOracleFactory.deploy();
  await lendingRateOracle.deployed();
  await lendingPoolAddressesProvider.setLendingRateOracle(lendingRateOracle.address);
  console.log('lendingRateOracle deployed to:', lendingRateOracle.address);

  const aaveProtocolDataProviderFactory = await hre.ethers.getContractFactory(
    'AaveProtocolDataProvider'
  );
  const aaveProtocolDataProvider = await aaveProtocolDataProviderFactory.deploy(
    lendingPoolAddressesProvider.address
  );
  await aaveProtocolDataProvider.deployed();
  console.log('aaveProtocolDataProvider deployed to:', aaveProtocolDataProvider.address);

  const defaultReserveInterestRateStrategyFactory = await hre.ethers.getContractFactory(
    'DefaultReserveInterestRateStrategy'
  );
  const defaultReserveInterestRateStrategy = await defaultReserveInterestRateStrategyFactory.deploy(
    lendingPoolAddressesProvider.address,
    BigInt(45e25),
    BigInt(1e25),
    BigInt(7e25),
    BigInt(3e27),
    BigInt(1e26),
    BigInt(3e27)
  );
  await defaultReserveInterestRateStrategy.deployed();
  console.log(
    'defaultReserveInterestRateStrategy deployed to:',
    defaultReserveInterestRateStrategy.address
  );

  const aTokenFactory = await hre.ethers.getContractFactory('AToken');
  const aToken = await aTokenFactory.deploy();
  await aToken.deployed();
  console.log('aToken deployed to:', aToken.address);

  const stableDebtTokenFactory = await hre.ethers.getContractFactory('StableDebtToken');
  const stableDebtToken = await stableDebtTokenFactory.deploy();
  await stableDebtToken.deployed();
  console.log('stableDebtToken deployed to:', stableDebtToken.address);

  const variableDebtTokenFactory = await hre.ethers.getContractFactory('VariableDebtToken');
  const variableDebtToken = await variableDebtTokenFactory.deploy();
  await variableDebtToken.deployed();
  console.log('variableDebtToken deployed to:', variableDebtToken.address);

  const usdtFactory = await hre.ethers.getContractFactory('MintableERC20');
  const usdt = await usdtFactory.deploy('usd coin', 'usdt', 18);
  await usdt.deployed();
  console.log('usdt deployed to:', usdt.address);

  const uni = await usdtFactory.deploy('uni coin', 'uni', 18);
  await uni.deployed();
  console.log('uni deployed to:', uni.address);

  //LendingPoolCollateralManager
  const lendingPoolCollateralManagerFactory = await hre.ethers.getContractFactory(
    'LendingPoolCollateralManager'
  );
  const lendingPoolCollateralManager = await lendingPoolCollateralManagerFactory.deploy();
  await lendingPoolCollateralManager.deployed();
  await lendingPoolAddressesProvider.setLendingPoolCollateralManager(
    lendingPoolCollateralManager.address
  );
  console.log('lendingPoolCollateralManager deployed to:', lendingPoolCollateralManager.address);

  var param = {};
  param.aTokenImpl = aToken.address;
  param.stableDebtTokenImpl = stableDebtToken.address;
  param.variableDebtTokenImpl = variableDebtToken.address;
  param.underlyingAssetDecimals = BigInt(18);
  param.interestRateStrategyAddress = defaultReserveInterestRateStrategy.address;
  param.underlyingAsset = usdt.address;
  param.treasury = deployer.address;
  param.incentivesController = zeroAddress;
  param.underlyingAssetName = 'USDT';
  param.aTokenName = 'a-USDT';
  param.aTokenSymbol = 'aUSDT';
  param.variableDebtTokenName = 'd-USDT';
  param.variableDebtTokenSymbol = 'dUSDT';
  param.stableDebtTokenName = 's-USDT';
  param.stableDebtTokenSymbol = 'sUSDT';
  param.params = '0x10';

  var param1 = {};
  param1.aTokenImpl = aToken.address;
  param1.stableDebtTokenImpl = stableDebtToken.address;
  param1.variableDebtTokenImpl = variableDebtToken.address;
  param1.underlyingAssetDecimals = BigInt(18);
  param1.interestRateStrategyAddress = defaultReserveInterestRateStrategy.address;
  param1.underlyingAsset = uni.address;
  param1.treasury = deployer.address;
  param1.incentivesController = zeroAddress;
  param1.underlyingAssetName = 'UNI';
  param1.aTokenName = 'a-UNI';
  param1.aTokenSymbol = 'aUNI';
  param1.variableDebtTokenName = 'd-UNI';
  param1.variableDebtTokenSymbol = 'dUNI';
  param1.stableDebtTokenName = 's-UNI';
  param1.stableDebtTokenSymbol = 'sUNI';
  param1.params = '0x10';

  await aaveOracle.setAssetPrice(usdt.address, BigInt(1e18));
  await aaveOracle.setAssetPrice(uni.address, BigInt(6e18));
  await proxyLendingPoolConfigurator.batchInitReserve([param, param1]);

  //   const wETHGatewayFactory = await hre.ethers.getContractFactory("WETHGateway");
  //   const wETHGateway = await wETHGatewayFactory.deploy();
  //   await wETHGateway.deployed();
  //   console.log("wETHGateway deployed to:", wETHGateway.address);

  const proxyLendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();
  const proxyLendingPool = await lendingPoolFactory.attach(proxyLendingPoolAddress);

  await usdt.mint(BigInt(1e22));
  await usdt.approve(proxyLendingPool.address, BigInt(1e22));
  await proxyLendingPool.deposit(usdt.address, BigInt(1e20), deployer.address, 0);

  await proxyLendingPoolConfigurator.enableBorrowingOnReserve(usdt.address, true);
  await proxyLendingPoolConfigurator.configureReserveAsCollateral(uni.address, 7000, 8000, 10500);

  // const alice = ethers.Wallet.createRandom();

  // console.log();
  console.log('bob:', bob.address);
  console.log('alice:', alice.address);
  console.log('deployer:', deployer.address);

  await uni.connect(alice).mint(BigInt(1e19));
  await uni.connect(alice).approve(proxyLendingPool.address, BigInt(1e19));
  await proxyLendingPool.connect(alice).deposit(uni.address, BigInt(1e19), alice.address, 0);

  await uni.connect(bob).mint(BigInt(1e19));
  await uni.connect(bob).approve(proxyLendingPool.address, BigInt(1e19));
  await proxyLendingPool.connect(bob).deposit(uni.address, BigInt(1e19), bob.address, 0);

  // await proxyLendingPool.connect(alice).
  // console.log(await aaveProtocolDataProvider.getReserveData(usdt.address));

  const bAmount = BigInt(12e18);

  await proxyLendingPool.connect(alice).borrow(usdt.address, BigInt(bAmount), 2, 0, alice.address);
  await proxyLendingPool.connect(bob).borrow(usdt.address, BigInt(bAmount), 2, 0, bob.address);

  // console.log(await aaveProtocolDataProvider.getReserveData(uni.address));
  // console.log(await hre.ethers.provider.getBlock('latest'));
  for (var i = 0; i < 1000; i++) {
    await ethers.provider.send('evm_mine');
  }
  // console.log(await proxyLendingPool.getUserAccountData(alice.address));
  // console.log(await hre.ethers.provider.getBlock('latest'));
  halfBAmount = BigInt(6e18);
  await usdt.connect(alice).approve(proxyLendingPool.address, BigInt(bAmount));
  await proxyLendingPool.connect(alice).repay(usdt.address, BigInt(halfBAmount), 2, alice.address);
  await proxyLendingPool.connect(alice).repay(usdt.address, BigInt(halfBAmount), 2, alice.address);

  await usdt.connect(bob).approve(proxyLendingPool.address, BigInt(bAmount));
  await proxyLendingPool.connect(bob).repay(usdt.address, BigInt(bAmount), 2, bob.address);
  console.log(await proxyLendingPool.getUserAccountData(alice.address));
  console.log(await proxyLendingPool.getUserAccountData(bob.address));
  const usdcStatus = await aaveProtocolDataProvider.getReserveData(usdt.address);
  // console.log(usdcStatus);

  const uniStatus = await aaveProtocolDataProvider.getReserveData(uni.address);
  // console.log(uniStatus);

  // Deposit and Borrow calculations
  // APY and APR are returned here as decimals, multiply by 100 to get the percents

  const RAY = 1e27;
  const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

  const depositAPR = usdcStatus.liquidityRate / RAY;
  const variableBorrowAPR = usdcStatus.variableBorrowRate / RAY;
  const stableBorrowAPR = usdcStatus.variableBorrowRate / RAY;

  const depositAPY = Math.pow(1 + depositAPR / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1;
  const variableBorrowAPY =
    Math.pow(1 + variableBorrowAPR / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1;
  const stableBorrowAPY = Math.pow(1 + stableBorrowAPR / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1;

  console.log(depositAPY);
  console.log(variableBorrowAPY);
  console.log(stableBorrowAPY);

  // Incentives calculation

  // aEmissionPerYear = aEmissionPerSecond * SECONDS_PER_YEAR;
  // vEmissionPerYear = vEmissionPerSecond * SECONDS_PER_YEAR;

  // WEI_DECIMALS = 10 ** 18; // All emissions are in wei units, 18 decimal places

  // // UNDERLYING_TOKEN_DECIMALS will be the decimals of token underlying the aToken or debtToken
  // // For Example, UNDERLYING_TOKEN_DECIMALS for aUSDC will be 10**6 because USDC has 6 decimals

  // incentiveDepositAPRPercent =
  //   (100 * (aEmissionPerYear * REWARD_PRICE_ETH * WEI_DECIMALS)) /
  //   (totalATokenSupply * TOKEN_PRICE_ETH * UNDERLYING_TOKEN_DECIMALS);

  // incentiveBorrowAPRPercent =
  //   (100 * (vEmissionPerYear * REWARD_PRICE_ETH * WEI_DECIMALS)) /
  //   (totalCurrentVariableDebt * TOKEN_PRICE_ETH * UNDERLYING_TOKEN_DECIMALS);

  //AaveProtocolDataProvider
  if (network.name == 'brc') {
    try {
      await hre.run('verify:verify', {
        address: lendingPoolAddressesProviderRegistry.address,
        constructorArguments: [],
      });
    } catch (err) {
      if (err.message.includes('Smart-contract already verified')) {
        console.log('Contract is already verified!');
      } else {
        throw err;
      }
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
