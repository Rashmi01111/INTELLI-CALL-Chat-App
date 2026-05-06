/**
 * Story Socket Handler - forward story notifications to the right recipients
 *
 * StoriesPage emits:
 * - story_shared_in_chat
 * - story_mention_notification
 * - story_reaction_in_chat (optional)
 */
class StorySocketHandler {
  constructor(io) {
    this.io = io;
  }

  initialize(socket, models) {
    const UserModel = models?.User;

    socket.on('story_mention_notification', async (data) => {
      try {
        const mentionedUserName = data?.mentionedUser;
        if (!mentionedUserName) return;

        // Prefer sharedToId-like routing via lookup by name (StoriesPage sends names)
        let targetUserId = data?.mentionedUserId;
        if (!targetUserId && UserModel?.findOne) {
          const u = await UserModel.findOne({ name: mentionedUserName }).select('_id').lean();
          targetUserId = u?._id?.toString();
        }

        if (!targetUserId) return;

        this.io.to(String(targetUserId)).emit('story_mention_notification', data);
        // Also show to sender for confirmation/debug (optional)
        socket.emit('story_mention_notification_sent', { ...data, targetUserId });
      } catch (err) {
        console.error('story_mention_notification error:', err?.message || err);
      }
    });

    socket.on('story_shared_in_chat', async (data) => {
      try {
        const sharedToId = data?.sharedToId;
        if (!sharedToId) return;

        const payload = { ...data, type: 'story_share' };
        this.io.to(String(sharedToId)).emit('story_shared_in_chat', payload);

        // Also emit to sender so their UI can optionally show confirmation
        socket.emit('story_shared_in_chat_sent', {
          ...payload,
          sharedToId
        });
      } catch (err) {
        console.error('story_shared_in_chat error:', err?.message || err);
      }
    });

    // Optional: forward reactions to story owner
    socket.on('story_reaction_in_chat', async (data) => {
      try {
        const storyUser = data?.storyUser;
        if (!storyUser) return;

        let targetUserId = data?.storyUserId;
        if (!targetUserId && UserModel?.findOne) {
          const u = await UserModel.findOne({ name: storyUser }).select('_id').lean();
          targetUserId = u?._id?.toString();
        }
        if (!targetUserId) return;

        this.io.to(String(targetUserId)).emit('story_reaction_in_chat', data);
      } catch (err) {
        console.error('story_reaction_in_chat error:', err?.message || err);
      }
    });
  }
}

export default StorySocketHandler;

