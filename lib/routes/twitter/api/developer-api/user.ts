import utils from '../../utils';

const handler = async (ctx) => {
    const id = ctx.req.param('id');
    // For compatibility
    const { include_replies, include_rts, count } = utils.parseRouteParams(ctx.req.param('routeParams'));
    const client = await utils.getAppClient();
    const user_timeline_query = {
        tweet_mode: 'extended',
        exclude_replies: !include_replies,
        include_rts,
        count,
    };
    let screen_name;
    if (id.startsWith('+')) {
        user_timeline_query.user_id = +id.slice(1);
    } else {
        user_timeline_query.screen_name = id;
        screen_name = id;
    }
    const data = await client.v1.get('statuses/user_timeline.json', user_timeline_query);
    const userInfo = data[0].user;
    if (!screen_name) {
        screen_name = userInfo.screen_name;
    }
    const profileImageUrl = userInfo.profile_image_url || userInfo.profile_image_url_https;

    return {
        title: `Twitter @${userInfo.name}`,
        link: `https://x.com/${screen_name}`,
        image: profileImageUrl,
        description: userInfo.description,
        item: await utils.ProcessFeed(ctx, {
            data,
        }),
    };
};
export default handler;
