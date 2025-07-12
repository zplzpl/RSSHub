// @ts-ignore - x-client-transaction-id may not have type declarations
import { ClientTransaction, handleXMigration } from 'x-client-transaction-id';
import { JSDOM } from 'jsdom';
import cache from '@/utils/cache';
import logger from '@/utils/logger';
import ofetch from '@/utils/ofetch';

// 缓存键和过期时间配置
const CACHE_KEY = 'twitter:x-homepage-xdom';
const CACHE_EXPIRE = 300; // 1小时
const FALLBACK_TRANSACTION_ID = '';

/**
 * 获取 X 主页 DOM 文档，带缓存机制
 */
async function getXHomepageDocument(): Promise<Document | null> {
    try {
        // 尝试从缓存获取
        const cachedHtml = await cache.get(CACHE_KEY);
        if (cachedHtml) {
            logger.debug('twitter transaction: using cached X homepage DOM');
            const dom = new JSDOM(cachedHtml, {
                url: 'https://x.com',
                pretendToBeVisual: false,
                resources: 'usable'
            });
            return dom.window.document;
        }

        // 缓存未命中，获取新的主页内容
        logger.debug('twitter transaction: fetching fresh X homepage DOM');
        
        // 尝试使用库提供的函数
        try {
            const document = await handleXMigration();
            // 缓存整个 HTML 内容
            const htmlContent = document.documentElement.outerHTML;
            await cache.set(CACHE_KEY, htmlContent, CACHE_EXPIRE);
            logger.debug('twitter transaction: cached fresh X homepage DOM');
            return document;
        } catch (error: any) {
            // 如果库函数失败，手动获取
            logger.debug('twitter transaction: handleXMigration failed, trying manual fetch');
            const response = await ofetch('https://x.com/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
                }
            });
            
            const dom = new JSDOM(response, {
                url: 'https://x.com',
                pretendToBeVisual: false,
                resources: 'usable'
            });
            
            // 缓存 HTML 内容
            await cache.set(CACHE_KEY, response, CACHE_EXPIRE);
            logger.debug('twitter transaction: manually fetched and cached X homepage DOM');
            return dom.window.document;
        }
    } catch (error: any) {
        logger.error(`twitter transaction: failed to get X homepage DOM: ${error.message}`);
        return null;
    }
}

/**
 * 生成 x-client-transaction-id
 */
export async function generateTransactionId(method: string = 'GET', path: string = ''): Promise<string> {
    try {
        const document = await getXHomepageDocument();
        if (!document) {
            logger.warn('twitter transaction: using fallback transaction ID due to DOM fetch failure');
            return FALLBACK_TRANSACTION_ID;
        }

        const transaction = await ClientTransaction.create(document);
        const transactionId = await transaction.generateTransactionId(method, path);
        
        logger.debug(`twitter transaction: generated transaction ID for ${method} ${path}`);
        return transactionId;
    } catch (error: any) {
        logger.error(`twitter transaction: failed to generate transaction ID: ${error.message}`);
        logger.warn('twitter transaction: using fallback transaction ID');
        return FALLBACK_TRANSACTION_ID;
    }
}

/**
 * 清除缓存的 DOM（用于调试或强制刷新）
 */
export async function clearDomCache(): Promise<void> {
    await cache.set(CACHE_KEY, '', 1);
    logger.debug('twitter transaction: DOM cache cleared');
} 