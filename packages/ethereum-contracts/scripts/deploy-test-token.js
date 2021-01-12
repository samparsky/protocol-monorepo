const { web3tx } = require("@decentral.ee/web3-helpers");
const Superfluid = require("@superfluid-finance/js-sdk");

const loadContracts = require("./loadContracts");
const { parseColonArgs } = require("./utils");

/**
 * @dev Deploy test token (Mintable ERC20) to the network.
 * @param from address to deploy contracts from
 *
 * Usage: npx truffle exec scripts/deploy-test-token.js : {TOKEN_NAME}
 */
module.exports = async function(
    callback,
    argv,
    { isTruffle, web3Provider, from } = {}
) {
    try {
        global.web3 = web3;

        if (!from) {
            const accounts = await web3.eth.getAccounts();
            from = accounts[0];
        }

        const { TestResolver, TestToken } = loadContracts({
            isTruffle,
            web3Provider: web3Provider || web3.currentProvider,
            from
        });

        const reset = !!process.env.RESET_TOKEN;
        const chainId = await web3.eth.net.getId(); // TODO use eth.getChainId;
        const config = Superfluid.getConfig(chainId);
        console.log("reset: ", reset);
        console.log("chain ID: ", chainId);

        const args = parseColonArgs(argv || process.argv);
        if (args.length !== 1) {
            throw new Error("Not enough arguments");
        }
        const tokenName = args.pop();
        console.log("Token name", tokenName);

        const testResolver = await TestResolver.at(config.resolverAddress);
        console.log("Resolver address", testResolver.address);

        // deploy test token and its super token
        const name = `tokens.${tokenName}`;
        let testTokenAddress = await testResolver.get(name);
        if (
            reset ||
            testTokenAddress === "0x0000000000000000000000000000000000000000"
        ) {
            const testToken = await web3tx(TestToken.new, "TestToken.new")(
                tokenName + " Fake Token",
                tokenName,
                18
            );
            testTokenAddress = testToken.address;
            await web3tx(testResolver.set, `TestResolver set ${name}`)(
                name,
                testTokenAddress
            );
        } else {
            console.log("Token already deployed");
        }
        console.log(`Token ${tokenName} address`, testTokenAddress);

        callback();
    } catch (err) {
        callback(err);
    }
};
