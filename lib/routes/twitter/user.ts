import { Route, ViewType } from '@/types';
import utils from './utils';
import api from './api';
import logger from '@/utils/logger';

export const route: Route = {
    path: '/user/:id/:routeParams?',
    categories: ['social-media'],
    view: ViewType.SocialMedia,
    example: '/twitter/user/_RSSHub',
    parameters: {
        id: 'username; in particular, if starts with `+`, it will be recognized as a [unique ID](https://github.com/DIYgod/RSSHub/issues/12221), e.g. `+44196397`',
        routeParams: 'extra parameters, see the table above',
    },
    features: {
        requireConfig: [
            {
                name: 'TWITTER_USERNAME',
                description: 'Please see above for details.',
            },
            {
                name: 'TWITTER_PASSWORD',
                description: 'Please see above for details.',
            },
            {
                name: 'TWITTER_AUTHENTICATION_SECRET',
                description: 'TOTP 2FA secret, please see above for details.',
                optional: true,
            },
            {
                name: 'TWITTER_AUTH_TOKEN',
                description: 'Please see above for details.',
            },
            {
                name: 'TWITTER_THIRD_PARTY_API',
                description: 'Use third-party API to query twitter data',
                optional: true,
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'User timeline',
    maintainers: ['DIYgod', 'yindaheng98', 'Rongronggg9', 'CaoMeiYouRen', 'pseudoyu'],
    handler,
    radar: [
        {
            source: ['x.com/:id'],
            target: '/user/:id',
        },
    ],
};

async function handler(ctx) {
    const id = ctx.req.param('id');

    // For compatibility
    const { count, include_replies, include_rts } = utils.parseRouteParams(ctx.req.param('routeParams'));
    const params = count ? { count } : {};

    await api.init();
    const userInfo = await api.getUser(id);
    let data;
    try {
        data = await (include_replies ? api.getUserTweetsAndReplies(id, params) : api.getUserTweets(id, params));
        if (!include_rts) {
            data = utils.excludeRetweet(data);
        }
    } catch (error) {
        logger.error(error);
    }

    const profileImageUrl = userInfo?.profile_image_url || userInfo?.profile_image_url_https;

    return {
        title: `Twitter @${userInfo?.name}`,
        link: `https://x.com/${userInfo?.screen_name}`,
        image: profileImageUrl.replace(/_normal.jpg$/, '.jpg'),
        description: userInfo?.description,
        item:
            data &&
            (await utils.ProcessFeed(ctx, {
                data,
            })),
        allowEmpty: true,
    };
}
