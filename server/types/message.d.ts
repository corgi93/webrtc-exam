interface LoginWebSocketMessage{
    channel: 'login',
    name: string;
}

interface StartCallWebSocketMessage{
    channel: 'start_call',
    otherPerson: string;
}

// ice-candidate 웹소켓 메세지
interface WebRTCIceCandidateWebSocketMessage{
    channel: 'webrtc_ice_candidate',
    candidate: RTCIceCandidate,
    otherPerson: string
}

interface WebRTCOfferWebSocketMessage {
    channel: "webrtc_offer";
    offer: RTCSessionDescription;
    otherPerson: string;
  }
  
  interface WebRTCAnswerWebSocketMessage {
    channel: "webrtc_answer";
    answer: RTCSessionDescription;
    otherPerson: string;
  }
  
  // 위의 4가지 webSocket 호출 메세지
  type WebSocketCallMessage =
    StartCallWebSocketMessage
    | WebRTCIceCandidateWebSocketMessage
    | WebRTCOfferWebSocketMessage
    | WebRTCAnswerWebSocketMessage;
  
  type WebSocketMessage = LoginWebSocketMessage | WebSocketCallMessage;
