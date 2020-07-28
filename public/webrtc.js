function hideElement(element) {
    element.style.display = "none";
}

function showElement(element) {
    element.style.display = "";
}

// 전화걸기 버튼 요소, video컨테이너 요소 가져오기
const callButton = document.getElementById("call-button");
const videoContainer = document.getElementById("video-container");

// local, remote 비디오 요소를 숨기고, 전화걸기 버튼만 display (처음 렌더링시)
function hideVideoCall() {
    hideElement(videoContainer);
    showElement(callButton);
}

// local, remote 비디오 요소 display, 전화걸기 버튼 숨기기
function showVideoCall() {
    hideElement(callButton);
    showElement(videoContainer);
}

let otherPerson;
const username = window.prompt('당신 이름이 뭔가요?', `user${Math.floor(Math.random()*100)}`);
const localUserName = document.getElementById('local-user-name');
localUserName.innerHTML = username;
console.log('이름 : ' + username);


const socketUrl = `ws://${location.host}/ws`;
// webSocket 객체 생성
const socket = new WebSocket(socketUrl);

/** 
 *  signaling server에 소켓으로 메세지 전송
    @param {WebSocketMessage} message : 보낼 메세지
*/
function sendMessageToSignallingServer(message) {
    const json = JSON.stringify(message);
    socket.send(json);
}

socket.addEventListener('open', () => {
    console.log('websocket 연결!');
    sendMessageToSignallingServer({
        channel: 'login',
        name: username
    });
});

// 3. 'message' 핸들러 추가. 시그널링 채널이 다른 peer로 부터 받은 message를 응답하기 위해 이벤트핸들러 등록
socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data.toString());
    handleMessage(message);
});

/**
 * 들어오는 메세지 처리
 * webRTC의 핵심은 SDP(Session Description Protocol)이라는 미디어 정보를 서로 
 * 교환하는 부분
 * @param {WebSocketMessage} message 
 */

async function handleMessage(message) {
    console.log(message);
    switch (message.channel) {
        case "start_call":
            console.log(message);
            console.log(`${message.otherPerson}에게 전화 응답을 받음`);
            otherPerson = message.otherPerson;
            showVideoCall();

            // createOffer로 수신자에게 전달할 offer SDP 생성
            const offer = await webrtc.createOffer();
            await webrtc.setLocalDescription(offer);
            sendMessageToSignallingServer({
                channel: 'webrtc_offer',
                offer,
                otherPerson
            });
            break;

        case "webrtc_ice_candidate":
            console.log('ice candidate 받음');
            await webrtc.addIceCandidate(message.candidate);
            break;

        case "webrtc_offer":
            console.log('webrtc offer 받음');
            await webrtc.setRemoteDescription(message.offer);

            const answer = await webrtc.createAnswer();
            await webrtc.setLocalDescription(answer);

            sendMessageToSignallingServer({
                channel: "webrtc_answer",
                answer,
                otherPerson
            });
            break;

        case "webrtc_answer":
            console.log('webrtc answer 받음');
            await webrtc.setRemoteDescription(message.answer);
            break;

        default:
            console.log('unknown message', message);
            break;
    }
}

// peer connection 객체 생성
const webrtc = new RTCPeerConnection({
    iceServers: [{
        urls: [
            "stun:stun.stunprotocol.org",
        ],
    }, ],
});

// 1. icecandidate 이벤트 리스터. - 
webrtc.addEventListener('icecandidate', (event) => {
    // event의 candidate가 없으면 그냥 return
    if (!event.candidate) {
        return;
    }
    // signalling server에 메세지 전송
    sendMessageToSignallingServer({
        channel: "webrtc_ice_candidate",
        candidate: event.candidate,
        otherPerson
    });
});

// track 이벤트 추가
webrtc.addEventListener("track", (event) => {
    /** @type {HTMLVideoElement} */
    const remoteVideo = document.getElementById("remote-video");
    remoteVideo.srcObject = event.streams[0];
});

// 교환할 미디어 제약 정보(constraint)
mediaConstraint = {
    video: true,
    audio: true
}

// 1. 미디어 장치 추가
window.navigator.mediaDevices.getUserMedia(mediaConstraint).then((localStream) => {
    /** @type {HTMLVideoElement} . video 엘리먼트 가져와 srcObject로 localStream 받아오기 */

    const localVideo = document.getElementById("local-video");
    localVideo.srcObject = localStream;

    for (const track of localStream.getTracks()) {
        console.log(track);
        webrtc.addTrack(track, localStream);
    }
});

const remoteUserName = document.getElementById('remote-user-name');
callButton.addEventListener('click', async() => {
    otherPerson = prompt('누구에게 전화 요청을 할 것입니까??');
    remoteUserName.innerHTML = otherPerson;

    showVideoCall();
    sendMessageToSignallingServer({
        channel: 'start_call',
        otherPerson
    });
});

hideVideoCall();