import cron from 'node-cron';
import { Account } from '../../models/Accounts.js';
import zernio from '../../config/zernio.js';
import ActivityLog from '../../models/ActivityLog.js';
import Post from '../../models/Post.js';
export {};
export const initScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const postsToPublish = await Post.find({
        status: 'scheduled',
        scheduledFor: {$lte: now }
      });
      for (const post of postsToPublish) {
        try {
          const accounts = await Account.find({
            user: post.user,
            platform: { $in: post.platforms },
            status: 'connected',
            zernioAccountId: { $exists: true }
          });
          if (accounts.length === 0) {
            console.log(`No connected zero accounts found for post ${post._id}`);
            continue;
          }
          const zernioPlatforms = accounts.map((acc) => ({
            platform: acc.platform,
            accountId: acc.zernioAccountId
          }));
          const payload = {
            content: post.content,
            publishNow: true,
            ...(post.mediaURL
              ? {
                  mediaItems: [
                    {
                      type: post.mediaType || 'image',
                      url: post.mediaURL
                    }
                  ]
                }
              : {}),
            platforms: zernioPlatforms
          };
          console.log(`Publishing post ${post._id} to zero with media ${post.mediaURL || 'none'}`);
          const response = await zernio.posts.createPost({ body: payload });
          const publishedPost = (response.data)?.post || response.data;
          if (!publishedPost) {
            throw new Error('Failed to get post object from zero response');
          }
          console.log(`Post created ${publishedPost._id || publishedPost.id}`);
          post.status = 'published';
          await post.save();
          await ActivityLog.create({
            user: post.user,
            actionType: 'POST_PUBLISHED',
            description: 'Published post to accounts',
            relatedPost: post._id
          });
        } catch (error) {
          console.error(`Failed to publish post ${post._id}`, error);
          post.status = 'failed';
          await post.save();
        }
      }
      if (postsToPublish.length > 0) {
        console.log(`Evaluated ${postsToPublish.length} post to publish at current time`);
      }
    } catch (error) {
      console.error('Error in scheduleuler', error);
    }
  });
  console.log('scheduleuler service initialized');
};
