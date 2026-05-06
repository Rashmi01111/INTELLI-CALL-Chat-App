/**
 * Call Socket Handler - WebRTC signaling for voice/video calls
 */
class CallSocketHandler {
  constructor(io, presenceManager) {
    this.io = io;
    this.presenceManager = presenceManager;
    this.activeCalls = new Map();
  }

  initialize(socket, models) {
    // WebRTC Offer
    socket.on('offer', (data) => {
      console.log(`📞 Call Offer from ${data.from} to ${data.to}`);
      if (data.toUserId) {
        this.io.to(data.toUserId).emit('offer', data);
        this.io.to(data.toUserId).emit('incoming_call', {
          from: data.from,
          fromUserId: data.fromUserId,
          type: data.type || 'video',
          offer: data.offer,
          timestamp: Date.now()
        });
      }
    });

    // WebRTC Answer
    socket.on('answer', (data) => {
      console.log(`📞 Call Answer from ${data.from} to ${data.to}`);
      if (data.toUserId) {
        this.io.to(data.toUserId).emit('answer', data);
      }
    });

    // ICE Candidates
    socket.on('ice-candidate', (data) => {
      if (data.toUserId) {
        this.io.to(data.toUserId).emit('ice-candidate', data);
      }
    });

    // Call subtitles
    socket.on('call_subtitle', (data) => {
      if (data.toUserId) {
        this.io.to(data.toUserId).emit('call_subtitle', data);
      }
    });

    // Call initiated
    socket.on('call_initiated', (data) => {
      console.log(`📞 Call initiated: ${data.fromUserName} -> ${data.toUserName}`);
      if (data.toUserId) {
        this.io.to(data.toUserId).emit('incoming_call_notification', {
          from: data.fromUserName,
          fromUserId: data.fromUserId,
          type: data.callType,
          timestamp: data.timestamp
        });
      }
    });

    // Call accepted
    socket.on('call_accepted', (data) => {
      console.log(`📞 Call accepted: ${data.fromUserName} <-> ${data.toUserName}`);
      const callId = `${data.fromUserId}_${data.toUserId}`;
      this.activeCalls.set(callId, {
        participants: [data.fromUserId, data.toUserId],
        startTime: Date.now()
      });

      this.io.to(data.fromUserId).emit('call_history_update', {
        type: 'outgoing',
        to: data.toUserName,
        callType: data.callType,
        timestamp: data.timestamp
      });

      this.io.to(data.toUserId).emit('call_history_update', {
        type: 'received',
        from: data.fromUserName,
        callType: data.callType,
        timestamp: data.timestamp
      });
    });

    // Call missed
    socket.on('call_missed', (data) => {
      console.log(`📞 Call missed: ${data.fromUserName} -> ${data.toUserName}`);
      this.io.to(data.fromUserId).emit('call_history_update', {
        type: 'outgoing',
        to: data.toUserName,
        callType: data.callType,
        timestamp: data.timestamp
      });

      this.io.to(data.toUserId).emit('call_history_update', {
        type: 'missed',
        from: data.fromUserName,
        callType: data.callType,
        timestamp: data.timestamp
      });
    });

    // Call ended
    socket.on('call_ended', (data) => {
      const duration = data.endTime && data.startTime
        ? Math.floor((data.endTime - data.startTime) / 1000)
        : 0;
      console.log(`📞 Call ended: ${data.fromUserName} <-> ${data.toUserName} (${duration}s)`);

      if (data.fromUserId) {
        this.io.to(data.fromUserId).emit('call_duration_update', {
          to: data.toUserName,
          callType: data.callType,
          startTime: data.startTime,
          duration
        });
      }

      if (data.toUserId) {
        this.io.to(data.toUserId).emit('call_duration_update', {
          from: data.fromUserName,
          callType: data.callType,
          startTime: data.startTime,
          duration
        });
      }

      const callId = `${data.fromUserId}_${data.toUserId}`;
      this.activeCalls.delete(callId);
    });

    // End call
    socket.on('end_call', (data) => {
      console.log(`📞 Call ended by ${data.fromUserName || data.fromUserId}`);
      if (data.toUserId) {
        this.io.to(data.toUserId).emit('call_ended', {
          fromUserName: data.fromUserName,
          fromUserId: data.fromUserId
        });
      }
    });

    // Profile picture updates
    socket.on('profile_pic_updated', (data) => {
      socket.broadcast.emit('user_profile_updated', {
        userId: data.userId,
        userName: data.userName,
        profilePic: data.profilePic
      });
    });
  }
}

export default CallSocketHandler;
