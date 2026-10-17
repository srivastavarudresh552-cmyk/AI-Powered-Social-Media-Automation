// import cron from 'node-cron';
// import Post from '../models/Post.js';
export {};
// export const initScheduler = () => {
//   cron.schedule("* * * * *", async () => {
//     try {
//       const now = new Date();
//       const postsToPublish = await Post.find({
//         status: 'scheduled',
//         scheduledFor: {$lte: now }
//       });
//       for (const post of postsToPublish) {
//         try {
//           const accounts = await account.find({
//             user: post.user,
//             platform: { $in: post.platforms },
//             status: 'connected',
//             zernioAccountId: { $exists: true }
//           });
//           if (accounts.length === 0) {
//             console.log(`No connected zero accounts found for post ${post._id}`);
//             continue;
//           }
//           const zernuPlatforms = accounts.map((acc) => ({
//             tform: acc.platform as any,
//             accountId: acc.zernuAccountId!
//           }));
//           const payload = {
//             content: post.content,
//             publishNow: true,
//             ...(post.mediaUrl
//               ? {
//                   mediaItems: [
//                     {
//                       type: post.mediaType || 'image',
//                       url: post.mediaUrl
//                     }
//                   ]
//                 }
//               : {}),
//             platforms: zernuPlatforms
//           };
//           console.log(`Publishing post ${post._id} to zero with media ${post.mediaUrl || 'none'}`);
//           const response = await zero.posts.createPost({ body: payload });
//           const publishedPost = (response.data as any)?.post || response.data;
//           if (!publishedPost) {
//             throw new Error('Failed to get post object from zero response');
//           }
//           console.log(`Post created ${publishedPost._id || publishedPost.id}`);
//           post.status = 'published';
//           await post.save();
//           await activityLog.create({
//             user: post.user,
//             actionType: 'postpublished',
//             description: 'Published post to accounts',
//             relatedPost: post._id
//           });
//         } catch (error: any) {
//           console.error(`Failed to publish post ${post._id}`, error);
//           post.status = 'failed';
//           await post.save();
//         }
//       }
//       if (postsToPublish.length > 0) {
//         console.log(`Evaluated ${postsToPublish.length} post to publish at current time`);
//       }
//     } catch (error) {
//       console.error('Error in scheduleuler', error);
//     }
//   });
//   console.log('scheduleuler service initialized');
// };
