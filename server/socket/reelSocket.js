/**
 * Reel Socket Handler - Real-time reel interactions
 */
class ReelSocketHandler {
  constructor(io, presenceManager) {
    this.io = io;
    this.presenceManager = presenceManager;
  }

  initialize(socket, models) {
    // Share reel to friends and groups
    socket.on('share_reel_to_friends_and_groups', async (data) => {
      try {
        const { from, fromId, reelId, caption, mediaUrl, mediaType, friends, groups } = data || {};
        console.log(`[Reel Share] Received share request from ${from} (${fromId}) for reel ${reelId}`);
        console.log(`[Reel Share] Friends: ${friends?.length || 0}, Groups: ${groups?.length || 0}`);

        const MessageModel = models?.Message;
        const UserModel = models?.User;
        console.log(`[Reel Share] MessageModel available: ${!!MessageModel}, UserModel available: ${!!UserModel}`);

        const friendsArr = Array.isArray(friends) ? friends : [];
        const groupsArr = Array.isArray(groups) ? groups : [];

        const messageContent = `📸 Reel: ${caption || 'Shared Reel'}`;
        const nowIso = new Date().toISOString();

        // Fetch friend names once so the client can route messages correctly (`message.to === receiverName`).
        const friendIdToName = new Map();
        if (friendsArr.length && UserModel?.find) {
          const friendUsers = await UserModel.find({ _id: { $in: friendsArr } })
            .select('_id name')
            .lean();

          for (const u of friendUsers) {
            if (!u?._id || !u?.name) continue;
            friendIdToName.set(u._id.toString(), u.name);
          }
        }

        const buildCommonMessageFields = () => ({
          user: from,
          senderId: fromId,
          text: messageContent,
          image: mediaType === 'image' ? mediaUrl : undefined,
          video: mediaType === 'video' ? mediaUrl : undefined,
          timestamp: nowIso,
          deliveryStatus: 'delivered',
          deliveredAt: new Date(),
          isSystem: false,
          isAI: false,
          isGhost: false,
          reelData: {
            _id: reelId,
            caption,
            mediaUrl,
            mediaType,
            createdBy: fromId,
            createdAt: nowIso
          },
          reactions: {},
          isForwarded: false,
          forwardedFrom: undefined
        });

        const messagesToSave = [];

        // Helper: also send to the sender so "shared reel" is visible immediately.
        const emitToSender = (roomId, messageData) => {
          if (!roomId) return;
          console.log(`[Reel Share] Emitting to sender ${roomId}`);
          // Reels sharing uses the same chat UI listeners (`message received` + `receive_message`)
          this.io.to(String(roomId)).emit('message received', messageData);
          this.io.to(String(roomId)).emit('receive_message', messageData);
        };

        // Share to friends
        for (const friendId of friendsArr) {
          const friendName = friendIdToName.get(String(friendId));
          if (!friendName) continue;

          const messageData = {
            ...buildCommonMessageFields(),
            id: `reel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            to: friendName
          };

          // Emit both events so every part of the UI updates.
          console.log(`[Reel Share] Emitting to friend ${friendId} (${friendName})`);
          this.io.to(friendId).emit('message received', messageData);
          this.io.to(friendId).emit('receive_message', messageData);
          emitToSender(fromId, messageData);
          messagesToSave.push(messageData);
        }

        // Share to groups
        for (const groupId of groupsArr) {
          const messageData = {
            ...buildCommonMessageFields(),
            id: `reel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            groupId
          };

          console.log(`[Reel Share] Emitting to group ${groupId}`);
          this.io.to(String(groupId)).emit('message received', messageData);
          this.io.to(String(groupId)).emit('receive_message', messageData);
          emitToSender(fromId, messageData);
          messagesToSave.push(messageData);
        }

        // Persist asynchronously (do not block real-time delivery)
        // If bulk insert fails for any reason, fall back to per-message create()
        if (MessageModel && messagesToSave.length) {
          console.log(`[Reel Share] Saving ${messagesToSave.length} messages to database...`);
          const saveBulk = MessageModel.insertMany
            ? MessageModel.insertMany(messagesToSave, { ordered: false })
            : Promise.reject(new Error('insertMany not available'));

          saveBulk
            .then((result) => {
              console.log(`[Reel Share] Successfully saved ${result?.length || messagesToSave.length} messages to database`);
            })
            .catch(async (err) => {
              console.error('[Reel Share] Failed saving messages (bulk):', err?.message || err);
              try {
                const savedMessages = await Promise.all(messagesToSave.map((m) => MessageModel.create(m)));
                console.log(`[Reel Share] Successfully saved ${savedMessages.length} messages using fallback`);
              } catch (err2) {
                console.error('[Reel Share] Failed saving messages (fallback create):', err2?.message || err2);
                // Notify sender that saving failed
                socket.emit('share_error', {
                  error: 'Failed to save shared reel to database',
                  details: err2 instanceof Error ? err2.message : String(err2)
                });
              }
            });
        } else {
          console.warn('[Reel Share] MessageModel not available or no messages to save');
        }

        // Confirm to sender
        socket.emit('reel_shared_confirmation', {
          reelId,
          friendsCount: friendsArr.length,
          groupsCount: groupsArr.length
        });

      } catch (error) {
        console.error('Share reel error:', error);
        socket.emit('share_error', {
          error: 'Failed to share reel',
          details: error instanceof Error ? error.message : String(error)
        });
        // Backward compatibility
        socket.emit('reel_share_error', { message: 'Failed to share reel' });
      }
    });

    // Reel interactions
    // Keep event names aligned with the frontend (`ReelsPage` listens to these).
    socket.on('reel_like', (data) => {
      socket.broadcast.emit('reel_like', data);
    });

    socket.on('reel_comment', (data) => {
      socket.broadcast.emit('reel_comment', data);
    });
  }
}

export default ReelSocketHandler;
