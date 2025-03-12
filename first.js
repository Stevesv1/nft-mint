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

const contractAddress = '0xF39c410Dac956BA98004f411E182FB4EEd595270'; // NFT Contract Address
const dataHex = '0xefef39a10000000000000000000000000000000000000000000000000000000000000002'; // Mint HEX Value
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
            maxPriorityFeePerGas = '1000000000'; // 1 GWEI in wei
            const extraGas = '1000000000'; // 1 GWEI in wei


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
            console.log('Retrying in 1 second...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    const tx = {
        from: account.address,
        to: contractAddress,
        value: value,
        data: dataHex,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        gas: estimatedGas.toString(),
    };

    // Send the transaction
    logWithColor(colors.yellow, '🚀', 'Sending transaction...');
    web3.eth.sendTransaction(tx)
        .on('transactionHash', hash => {
            logWithColor(colors.blue, '🔗', `Transaction hash: ${hash}`);
        })
        .on('receipt', receipt => {
            logWithColor(colors.green, '🎉', 'Transaction successful!');
            console.log('Block number:', receipt.blockNumber);
            console.log('Gas used:', receipt.gasUsed);
        })
        .on('error', error => {
            logWithColor(colors.red, '❌', `Transaction failed: ${error.message}`);
        });
})();
