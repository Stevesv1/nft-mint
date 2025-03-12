require('dotenv').config();
const Web3 = require('web3');

const colors = {
    reset: '\x1b[0m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
};

function logWithColor(color, emoji, message) {
    console.log(`${color}${emoji} ${message}${colors.reset}`);
}

const web3 = new Web3(process.env.RPC_URL);

const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

const contractAddress = '0x3254FED2575630a9985f6a5f201129D9ec92dbc1'; // NFT Contract Address
const dataHex = '0x1249c58b'; // Mint HEX Value
const value = web3.utils.toWei('0.1', 'ether'); // NFT Mint Price

(async () => {
    logWithColor(colors.yellow, '🚀', 'Starting transaction script...');
    console.log('Account address:', account.address);
    console.log('Contract address:', contractAddress);
    console.log('Data HEX:', dataHex);
    console.log('Value to send:', web3.utils.fromWei(value, 'ether'), 'ETH');

    let estimatedGas;
    let maxFeePerGas, maxPriorityFeePerGas;
    while (true) {
        try {
            const latestBlock = await web3.eth.getBlock('latest');
            const baseFeePerGas = latestBlock.baseFeePerGas.toString();

            // Define gas parameters
            maxPriorityFeePerGas = '100000000000'; // 100 GWEI in wei
            const extraGas = '20000000000'; // 20 GWEI in wei

            const baseFeePerGasBN = web3.utils.toBN(baseFeePerGas);
            const maxPriorityFeePerGasBN = web3.utils.toBN(maxPriorityFeePerGas);
            const extraGasBN = web3.utils.toBN(extraGas);
            const maxFeePerGasBN = baseFeePerGasBN.add(maxPriorityFeePerGasBN).add(extraGasBN);
            maxFeePerGas = maxFeePerGasBN.toString();

            logWithColor(colors.cyan, '📊', 'Gas info:');
            console.log('  Base fee per gas:', web3.utils.fromWei(baseFeePerGas, 'gwei'), 'GWEI');
            console.log('  Max priority fee per gas:', web3.utils.fromWei(maxPriorityFeePerGas, 'gwei'), 'GWEI');
            console.log('  Max fee per gas:', web3.utils.fromWei(maxFeePerGas, 'gwei'), 'GWEI');

            const txForEstimate = {
                from: account.address,
                to: contractAddress,
                value: value,
                data: dataHex,
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
            };

            // Simulate the transaction
            estimatedGas = await web3.eth.estimateGas(txForEstimate);
            logWithColor(colors.green, '✅', `Simulation successful. Estimated gas: ${estimatedGas}`);
            break;
        } catch (error) {
            logWithColor(colors.red, '❌', `Simulation failed: ${error.message}`);
            console.log('Retrying in 500 ms...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    const nonce = await web3.eth.getTransactionCount(account.address, 'pending');

    const tx = {
        from: account.address,
        to: contractAddress,
        value: value,
        data: dataHex,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        gas: estimatedGas.toString(),
        nonce: nonce,
    };

    // Transaction sending loop with retry logic
    logWithColor(colors.yellow, '🚀', 'Starting to send transaction...');
    while (true) {
        try {
            const sendTx = web3.eth.sendTransaction(tx);
            sendTx.on('transactionHash', hash => {
                logWithColor(colors.blue, '🔗', `Transaction hash: ${hash}`);
            });
            const receipt = await sendTx;
            logWithColor(colors.green, '🎉', 'Transaction successful!');
            console.log('Block number:', receipt.blockNumber);
            console.log('Gas used:', receipt.gasUsed);
            break; // Exit loop on success
        } catch (error) {
            if (error.message.includes('Returned error:') && error.message.includes('Too Many Requests')) {
                logWithColor(colors.red, '❌', 'Rate limit hit, retrying in 500 ms...');
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                logWithColor(colors.red, '❌', `Transaction failed: ${error.message}`);
                break; // Stop retrying on other errors
            }
        }
    }
})();
