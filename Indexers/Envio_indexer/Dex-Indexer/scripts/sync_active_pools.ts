import { HypersyncClient } from "@envio-dev/hypersync-client";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as dotenv from "dotenv";

dotenv.config();

const DUNE_API_KEY = process.env.DUNE_API_KEY;
if (!DUNE_API_KEY) throw new Error("DUNE_API_KEY is required; fallback credentials are not supported");
const DUNE_API_URL = new URL("https://api.dune.com/api/v1/query/7361962/results");
DUNE_API_URL.searchParams.set("limit", "100000");

const NETWORKS = {
    1: { name: "ethereum", url: "https://eth.hypersync.xyz", blocksPerWeek: 50400 },
    42161: { name: "arbitrum", url: "https://arbitrum.hypersync.xyz", blocksPerWeek: 2419200 },
    10: { name: "optimism", url: "https://optimism.hypersync.xyz", blocksPerWeek: 302400 },
};

async function syncPools() {
    console.log("Fetching active pools from Dune...");
    const response = await fetch(DUNE_API_URL, { headers: { "X-Dune-API-Key": DUNE_API_KEY } });
    if (!response.ok) throw new Error(`Dune request failed with status ${response.status}`);
    const duneData: any = await response.json();
    const rows = duneData.result?.rows || [];
    console.log(`Found ${rows.length} pools in Dune results.`);

    const chainMap: Record<string, number> = { ethereum: 1, arbitrum: 42161, optimism: 10 };
    const poolsByChain: Record<number, string[]> = { 1: [], 42161: [], 10: [] };
    const registry: Record<string, any> = {};

    rows.forEach((row: any) => {
        const chainId = chainMap[row.blockchain];
        if (!chainId || !row.pool_address) return;
        const poolAddress = row.pool_address.toLowerCase();
        poolsByChain[chainId].push(poolAddress);
        const tokenA = row.token_bought_address?.toLowerCase();
        const tokenB = row.token_sold_address?.toLowerCase();
        if (!tokenA || !tokenB) return;
        const tokenAFirst = tokenA < tokenB;
        registry[`${chainId}-${poolAddress}`] = {
            t0: tokenAFirst ? tokenA : tokenB,
            t1: tokenAFirst ? tokenB : tokenA,
            fee: row.fee || 3000,
            t0Meta: { symbol: tokenAFirst ? row.token_bought_symbol : row.token_sold_symbol, decimals: tokenAFirst ? row.token_bought_decimals : (row.token1_sold_decimals || row.token_sold_decimals) },
            t1Meta: { symbol: tokenAFirst ? row.token_sold_symbol : row.token_bought_symbol, decimals: tokenAFirst ? (row.token1_sold_decimals || row.token_sold_decimals) : row.token_bought_decimals },
        };
    });

    const registryPath = path.join(__dirname, "../src/handlers/utils/poolReg.json");
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    const configPath = path.join(__dirname, "../config.yaml");
    const config = yaml.load(fs.readFileSync(configPath, "utf-8")) as any;

    for (const [chainIdText, info] of Object.entries(NETWORKS)) {
        const chainId = Number.parseInt(chainIdText, 10);
        const client = new HypersyncClient({ url: info.url, apiToken: process.env.ENVIO_API_TOKEN || "" });
        try {
            const currentBlock = await client.getHeight();
            const network = config.networks.find((item: any) => item.id === chainId);
            if (!network) continue;
            network.start_block = Math.max(0, currentBlock - info.blocksPerWeek);
            const poolContract = network.contracts.find((item: any) => item.name === "UniswapV3Pool");
            if (poolContract) poolContract.address = poolsByChain[chainId];
        } catch (error) {
            console.error(`Failed to update chain ${chainId}`);
        }
    }
    fs.writeFileSync(configPath, yaml.dump(config, { noRefs: true, lineWidth: -1 }));
    console.log("Pool registry and config updated.");
}

syncPools().catch(() => { console.error("Pool synchronization failed"); process.exitCode = 1; });
