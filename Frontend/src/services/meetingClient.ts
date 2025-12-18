import type { User } from '../types/domain';

const resolveWebSocketBaseUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    const trimmed = import.meta.env.VITE_WS_URL.trim();
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

const WS_BASE_URL = resolveWebSocketBaseUrl();

export type MeetingSignalMessage = {
  type: string;
  meetingCode: string;
  fromUserId?: string;
  toUserId?: string;
  participants?: (string | number)[];
  payload?: any;
  userId?: string | number;
  isOn?: boolean;
};

interface MeetingClientOptions {
  classroomId: string;
  user: User;
  signalingToken?: string;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved: (userId: string) => void;
  onParticipantJoined?: (userId: string) => void;
  onParticipantLeft?: (userId: string) => void;
  onRaiseHand?: (userId: string, raised: boolean) => void;
  onChatMessage?: (userId: string, userName: string, message: string, timestamp: Date) => void;
  onMeetingEnded?: () => void;
  onMicStateChanged?: (userId: string, isOn: boolean) => void;
  onCamStateChanged?: (userId: string, isOn: boolean) => void;
}

export interface MeetingClient {
  setLocalStream(stream: MediaStream | null): void;
  join(): void;
  leave(): void;
  raiseHand(raised: boolean): void;
  sendChatMessage(message: string): void;
  endMeeting(): void;
  updateMicState(isOn: boolean): void;
  updateCamState(isOn: boolean): void;
}

export function createMeetingClient(options: MeetingClientOptions): MeetingClient {
  const { classroomId, user, signalingToken, onRemoteStream, onRemoteStreamRemoved, onParticipantJoined, onParticipantLeft, onRaiseHand, onChatMessage, onMeetingEnded, onMicStateChanged, onCamStateChanged } = options;

  let socket: WebSocket | null = null;
  let localStream: MediaStream | null = null;
  const peers = new Map<string, RTCPeerConnection>();
  const pendingRemotePeers = new Set<string>(); // Track peers we need to create offers for

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Enhanced logging
  const log = {
    debug: (...args: any[]) => console.log('[MeetingClient]', ...args),
    error: (...args: any[]) => console.error('[MeetingClient]', ...args),
    warn: (...args: any[]) => console.warn('[MeetingClient]', ...args),
  };

  function send(message: Omit<MeetingSignalMessage, 'meetingCode' | 'fromUserId'> & {
    toUserId?: string;
  }) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const full: MeetingSignalMessage = {
      meetingCode: classroomId,
      fromUserId: user.id,
      ...message,
    } as MeetingSignalMessage;
    socket.send(JSON.stringify(full));
  }

  function createPeerConnection(remoteUserId: string, isInitiator: boolean) {
    if (peers.has(remoteUserId)) {
      log.debug(`Peer connection already exists for user ${remoteUserId}`);
      return peers.get(remoteUserId)!;
    }

    log.debug(`Creating peer connection with user ${remoteUserId}, isInitiator=${isInitiator}`);
    const pc = new RTCPeerConnection({ iceServers });

    // Add local stream tracks if available
    if (localStream) {
      const tracks = localStream.getTracks();
      log.debug(`Adding ${tracks.length} local tracks to peer ${remoteUserId}`);
      tracks.forEach((track) => {
        pc.addTrack(track, localStream!);
        log.debug(`Added ${track.kind} track (enabled=${track.enabled}) to peer ${remoteUserId}`);
      });
    } else {
      log.warn(`No local stream available when creating peer connection with ${remoteUserId}`);
      // Track this peer so we can add tracks later when stream is available
      pendingRemotePeers.add(remoteUserId);
    }

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        log.debug(`Sending ICE candidate to ${remoteUserId}`);
        send({
          type: 'ice-candidate',
          toUserId: remoteUserId,
          payload: event.candidate,
        });
      } else {
        log.debug(`ICE gathering complete for peer ${remoteUserId}`);
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      log.debug(`Peer ${remoteUserId} connection state: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        log.warn(`Peer ${remoteUserId} connection ${pc.connectionState}`);
      }
    };

    pc.oniceconnectionstatechange = () => {
      log.debug(`Peer ${remoteUserId} ICE state: ${pc.iceConnectionState}`);
    };

    // Remote track handling
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        log.debug(`Received ${event.track.kind} track from ${remoteUserId}, stream has ${stream.getTracks().length} tracks`);
        onRemoteStream(remoteUserId, stream);
      } else {
        log.warn(`Received track from ${remoteUserId} but no stream`);
      }
    };

    peers.set(remoteUserId, pc);

    // Create and send offer if we're the initiator
    if (isInitiator) {
      pc
        .createOffer()
        .then((offer) => {
          log.debug(`Created offer for ${remoteUserId}`);
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          if (pc.localDescription) {
            log.debug(`Sending offer to ${remoteUserId}`);
            send({
              type: 'offer',
              toUserId: remoteUserId,
              payload: pc.localDescription,
            });
          }
        })
        .catch((err) => {
          log.error(`Error creating offer for ${remoteUserId}:`, err);
        });
    }

    return pc;
  }

  function updateSendersForNewStream() {
    if (!localStream) {
      log.warn('updateSendersForNewStream called but no local stream');
      return;
    }
    
    const videoTrack = localStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0];

    log.debug(`Updating senders for new stream. Video: ${videoTrack?.enabled}, Audio: ${audioTrack?.enabled}`);

    peers.forEach((pc, remoteUserId) => {
      const senders = pc.getSenders();
      let hasVideoSender = false;
      let hasAudioSender = false;

      senders.forEach((sender) => {
        if (sender.track?.kind === 'video') {
          hasVideoSender = true;
          if (videoTrack) {
            log.debug(`Replacing video track for peer ${remoteUserId}`);
            sender.replaceTrack(videoTrack).catch((err) =>
              log.error(`Error replacing video track for ${remoteUserId}:`, err)
            );
          } else {
            log.debug(`Removing video track for peer ${remoteUserId}`);
            sender.replaceTrack(null).catch((err) =>
              log.error(`Error removing video track for ${remoteUserId}:`, err)
            );
          }
        }
        if (sender.track?.kind === 'audio') {
          hasAudioSender = true;
          if (audioTrack) {
            log.debug(`Replacing audio track for peer ${remoteUserId}`);
            sender.replaceTrack(audioTrack).catch((err) =>
              log.error(`Error replacing audio track for ${remoteUserId}:`, err)
            );
          } else {
            log.debug(`Removing audio track for peer ${remoteUserId}`);
            sender.replaceTrack(null).catch((err) =>
              log.error(`Error removing audio track for ${remoteUserId}:`, err)
            );
          }
        }
      });

      // If no senders exist yet, add tracks (for peers created before stream was available)
      if (!hasVideoSender && videoTrack && localStream) {
        log.debug(`Adding video track to peer ${remoteUserId}`);
        pc.addTrack(videoTrack, localStream);
        // Renegotiate
        if (pc.signalingState === 'stable') {
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              if (pc.localDescription) {
                send({
                  type: 'offer',
                  toUserId: remoteUserId,
                  payload: pc.localDescription,
                });
              }
            })
            .catch(err => log.error(`Error renegotiating after adding video track to ${remoteUserId}:`, err));
        }
      } else if (hasVideoSender && videoTrack) {
        // If we already have a video sender, we might need to renegotiate if track properties changed
        // This ensures that remote peers get updated track information
        if (pc.signalingState === 'stable') {
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              if (pc.localDescription) {
                send({
                  type: 'offer',
                  toUserId: remoteUserId,
                  payload: pc.localDescription,
                });
              }
            })
            .catch(err => log.error(`Error renegotiating video track for ${remoteUserId}:`, err));
        }
      }
    
      if (!hasAudioSender && audioTrack && localStream) {
        log.debug(`Adding audio track to peer ${remoteUserId}`);
        pc.addTrack(audioTrack, localStream);
        // Renegotiate for audio as well
        if (pc.signalingState === 'stable') {
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              if (pc.localDescription) {
                send({
                  type: 'offer',
                  toUserId: remoteUserId,
                  payload: pc.localDescription,
                });
              }
            })
            .catch(err => log.error(`Error renegotiating after adding audio track to ${remoteUserId}:`, err));
        }
      } else if (hasAudioSender && audioTrack) {
        // If we already have an audio sender, we might need to renegotiate if track properties changed
        if (pc.signalingState === 'stable') {
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              if (pc.localDescription) {
                send({
                  type: 'offer',
                  toUserId: remoteUserId,
                  payload: pc.localDescription,
                });
              }
            })
            .catch(err => log.error(`Error renegotiating audio track for ${remoteUserId}:`, err));
        }
      }
    
      // Remove from pending list
      pendingRemotePeers.delete(remoteUserId);
    });
  }

  function handleMessage(raw: MessageEvent<string>) {
    let msg: MeetingSignalMessage;
    try {
      msg = JSON.parse(raw.data);
    } catch (e) {
      console.error('Invalid meeting message', raw.data, e);
      return;
    }

    if (String(msg.meetingCode) !== String(classroomId)) return;

    switch (msg.type) {
      case 'existing-participants': {
        const participants = (msg.participants ?? []).map(String);
        log.debug(`Received existing participants: ${participants.length} peers`);
        participants.forEach((remoteId) => {
          if (remoteId === String(user.id)) return;
          log.debug(`Creating peer connection as initiator for existing participant ${remoteId}`);
          if (onParticipantJoined) {
            onParticipantJoined(remoteId);
          }
          createPeerConnection(remoteId, true);
        });
        break;
      }
      case 'offer': {
        if (!msg.fromUserId || !msg.payload) return;
        const remoteId = String(msg.fromUserId);
        log.debug(`Received offer from ${remoteId}`);
        if (onParticipantJoined && remoteId !== String(user.id)) {
          onParticipantJoined(remoteId);
        }
        const pc = createPeerConnection(remoteId, false);
        pc
          .setRemoteDescription(new RTCSessionDescription(msg.payload))
          .then(() => {
            log.debug(`Set remote description from ${remoteId}, creating answer`);
            return pc.createAnswer();
          })
          .then((answer) => {
            log.debug(`Created answer for ${remoteId}`);
            return pc.setLocalDescription(answer);
          })
          .then(() => {
            if (pc.localDescription) {
              log.debug(`Sending answer to ${remoteId}`);
              send({
                type: 'answer',
                toUserId: remoteId,
                payload: pc.localDescription,
              });
            }
          })
          .catch((err) => log.error(`Error handling offer from ${remoteId}:`, err));
        break;
      }
      case 'answer': {
        if (!msg.fromUserId || !msg.payload) return;
        const remoteId = String(msg.fromUserId);
        log.debug(`Received answer from ${remoteId}`);
        const pc = peers.get(remoteId);
        if (!pc) {
          log.warn(`Received answer from ${remoteId} but no peer connection exists`);
          return;
        }
        pc
          .setRemoteDescription(new RTCSessionDescription(msg.payload))
          .then(() => log.debug(`Set remote description (answer) from ${remoteId}`))
          .catch((err) => log.error(`Error handling answer from ${remoteId}:`, err));
        break;
      }
      case 'ice-candidate': {
        if (!msg.fromUserId || !msg.payload) return;
        const remoteId = String(msg.fromUserId);
        const pc = peers.get(remoteId);
        if (!pc) {
          log.warn(`Received ICE candidate from ${remoteId} but no peer connection exists`);
          return;
        }
        pc
          .addIceCandidate(new RTCIceCandidate(msg.payload))
          .then(() => log.debug(`Added ICE candidate from ${remoteId}`))
          .catch((err) => log.error(`Error adding ICE candidate from ${remoteId}:`, err));
        break;
      }
      case 'participant-joined': {
        if (!msg.userId) return;
        const remoteId = String(msg.userId);
        log.debug(`Participant ${remoteId} joined`);
        if (onParticipantJoined && remoteId !== String(user.id)) {
          onParticipantJoined(remoteId);
        }
        // Create peer connection and send offer (we're the existing participant)
        if (remoteId !== String(user.id) && !peers.has(remoteId)) {
          log.debug(`Creating peer connection and sending offer to new participant ${remoteId}`);
          createPeerConnection(remoteId, true);
        }
        break;
      }
      case 'participant-left': {
        const remoteId = String(msg.userId ?? '');
        log.debug(`Participant ${remoteId} left`);
        const pc = peers.get(remoteId);
        if (pc) {
          pc.close();
          peers.delete(remoteId);
          log.debug(`Closed peer connection with ${remoteId}`);
        }
        pendingRemotePeers.delete(remoteId);
        if (onParticipantLeft) {
          onParticipantLeft(remoteId);
        }
        onRemoteStreamRemoved(remoteId);
        break;
      }
      case 'raise-hand': {
        if (!onRaiseHand || !msg.fromUserId) return;
        const raised = Boolean(msg.payload?.raised ?? true);
        onRaiseHand(String(msg.fromUserId), raised);
        break;
      }
      case 'chat-message': {
        if (!onChatMessage || !msg.fromUserId) return;
        const message = String(msg.payload?.message ?? '');
        const userName = String(msg.payload?.userName ?? msg.fromUserId);
        const timestamp = msg.payload?.timestamp ? new Date(msg.payload.timestamp) : new Date();
        onChatMessage(String(msg.fromUserId), userName, message, timestamp);
        break;
      }
      case 'end-meeting': {
        log.debug('Received end-meeting signal from teacher');
        if (onMeetingEnded) {
          onMeetingEnded();
        }
        break;
      }
      case 'mic-state': {
        if (!onMicStateChanged) return;
        const userId = String(msg.userId ?? '');
        const isOn = Boolean(msg.isOn ?? false);
        log.debug(`Received mic state update: User ${userId} mic ${isOn ? 'ON' : 'OFF'}`);
        onMicStateChanged(userId, isOn);
        break;
      }
      case 'cam-state': {
        if (!onCamStateChanged) return;
        const userId = String(msg.userId ?? '');
        const isOn = Boolean(msg.isOn ?? false);
        log.debug(`Received cam state update: User ${userId} cam ${isOn ? 'ON' : 'OFF'}`);
        onCamStateChanged(userId, isOn);
        break;
      }
      case 'error': {
        const errorMessage = msg.payload?.message || 'Meeting error';
        log.error('Meeting error:', errorMessage);
        // Close connection on error
        cleanup();
        break;
      }
      default:
        break;
    }
  }

  function cleanup() {
    peers.forEach((pc) => pc.close());
    peers.clear();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    socket = null;
  }

  return {
    setLocalStream(stream: MediaStream | null) {
      localStream = stream;
      if (localStream) {
        const tracks = localStream.getTracks();
        log.debug(`Set local stream with ${tracks.length} tracks (video=${localStream.getVideoTracks().length}, audio=${localStream.getAudioTracks().length})`);
        if (peers.size > 0) {
          log.debug(`Updating ${peers.size} existing peer connections with new stream`);
          updateSendersForNewStream();
        }
      } else {
        log.debug('Local stream cleared');
      }
    },
    join() {
      if (socket && socket.readyState === WebSocket.OPEN) {
        log.warn('Already connected to meeting WebSocket');
        return;
      }

      const wsUrl = `${WS_BASE_URL}/meet`;
      log.debug('Connecting to WebSocket:', wsUrl);
      socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        log.debug('WebSocket connected, sending join message with token');
        const joinMsg: MeetingSignalMessage = {
          type: 'join',
          meetingCode: classroomId,
          fromUserId: user.id,
          payload: signalingToken ? { token: signalingToken } : undefined,
        };
        socket?.send(JSON.stringify(joinMsg));
      };
      socket.onmessage = handleMessage as (ev: MessageEvent) => void;
      socket.onclose = () => {
        log.debug('WebSocket closed');
        cleanup();
      };
      socket.onerror = (e) => {
        log.error('Meeting WebSocket error:', e);
      };
    },
    leave() {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const leaveMsg: MeetingSignalMessage = {
          type: 'leave',
          meetingCode: classroomId,
          fromUserId: user.id,
        };
        socket.send(JSON.stringify(leaveMsg));
      }
      cleanup();
    },
    raiseHand(raised: boolean) {
      send({
        type: 'raise-hand',
        payload: { raised },
      });
    },
    sendChatMessage(message: string) {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn('Cannot send chat message: WebSocket not connected');
        return;
      }
      send({
        type: 'chat-message',
        payload: {
          message,
          userName: user.name || 'Unknown',
          timestamp: new Date().toISOString(),
        },
      });
    },
    endMeeting() {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        log.warn('Cannot end meeting: WebSocket not connected');
        return;
      }
      log.debug('Sending meeting-ended signal to all participants');
      send({
        type: 'end-meeting',
      });
    },
    updateMicState(isOn: boolean) {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        log.warn('Cannot update mic state: WebSocket not connected');
        return;
      }
      log.debug(`Sending mic state update: ${isOn ? 'ON' : 'OFF'}`);
      
      // Update the actual audio track enabled state
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = isOn;
        });
        
        // Force renegotiation by updating senders with the new track state
        if (peers.size > 0) {
          updateSendersForNewStream();
        }
      }
      
      send({
        type: 'mic-state',
        payload: { isOn },
      });
    },
    updateCamState(isOn: boolean) {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        log.warn('Cannot update cam state: WebSocket not connected');
        return;
      }
      log.debug(`Sending cam state update: ${isOn ? 'ON' : 'OFF'}`);
      
      // Update the actual video track enabled state
      if (localStream) {
        localStream.getVideoTracks().forEach(track => {
          track.enabled = isOn;
        });
        
        // Force renegotiation by updating senders with the new track state
        if (peers.size > 0) {
          updateSendersForNewStream();
        }
      }
      
      send({
        type: 'cam-state',
        payload: { isOn },
      });
    },
  };
}
