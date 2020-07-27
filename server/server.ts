// it's easiest to share typedefs as an ambient declaration file
/// <reference path="./types/message.d.ts" />

// signaling server - using websocket (express)
import * as express from 'express';
import * as expressWs from 'express-ws';
import * as WebSocket from 'ws';
import { createServer } from 'http';
// import * as Message from './message';

// 유저 인터페이스. WebSocket객체와 이름을 담음
interface User {
    socket: WebSocket;
    name: string;
}

// 연결된 유저들 리스트
let connectedUsers: User[] = [];

/* 현재 연결된 사용자를 검색해 제공된 소켓에 연결된 첫 번째 사용자를 반환 */
function findUserBySocket(socket: WebSocket): User | undefined {
    return connectedUsers.find((user) => user.socket === socket);
}

/* 현재 연결된 사용자를 검색하여 제공된 이름의 첫 번째 사용자를 반환 */
function findUserByName(name: string): User | undefined {
    return connectedUsers.find((user) => user.name === name);
}

/**
 다른 사람에게 메세지 forward 
 * @param sender 원래 메세지를 보낸 
*/
function forwardMessageToOtherPerson(sender: User, message: WebSocketCallMessage): void {
    const receiver = findUserByName(message.otherPerson);
    if (!receiver) {
        // 받는 사람이 없으면 아무것도 리턴하지 x 
        return;
    }
    const json = JSON.stringify({
        ...message,
        otherPerson: sender.name
    });
    receiver.socket.send(json);
}

/**
 * 들어오는 message를 처리하는 function
 * @param socket : 보낸 message socket
 * @param message : message 그 자체
 */
function handleMessage(socket: WebSocket, message: WebSocketMessage): void {
    const sender = findUserBySocket(socket) || {
        name: "[unknown]",
        socket,
    };

    switch (message.channel) {
        case "login":
            console.log(`${message.name} joined`);
            connectedUsers.push({ socket, name: message.name });
            break;
        case "start_call":
            console.log(`보낸사람 :${sender.name} - 받는사람: ${message.otherPerson}에게 전화 요청함 `);
            forwardMessageToOtherPerson(sender, message);
            break;
        case "webrtc_ice_candidate":
            console.log(`sender : ${sender.name}으로부터 ice candidate를 받음`);
            forwardMessageToOtherPerson(sender, message);
            break;
        case "webrtc_offer":
            console.log(`sender : ${sender.name}으로부터 offer를 받음`);
            forwardMessageToOtherPerson(sender, message);
            break;
        case "webrtc_answer":
            console.log(`sender : ${sender.name}으로부터 answer 받음`);
            forwardMessageToOtherPerson(sender, message);
            break;
        default:
            console.log("unknown message", message);
            break;
    }
}

/**
 * 들어오는 소켓에 대한 이벤트리스터 추가
 * @param socket : 들어오는 WebSocket. 
*/
function handleSocketConnection(socket: WebSocket): void {
    socket.addEventListener('message', (event) => {
        /*
            들어올 메세지들은 버퍼 문자열이므로
            그 버퍼 문자열들을 JSON.parse()로 Obejct로 convert해야함
            그렇게 유효하고 안전한 json데이터라 봐도 무방하다.
        */

        // event는 버퍼 스트링이므로 object형으로 변환
        const json = JSON.parse(event.data.toString());
        console.log(socket);
        console.log(json);
        handleMessage(socket, json);
    });

    socket.addEventListener('close', () => {
        // 유저 리스트에서 유저 삭제
        connectedUsers = connectedUsers.filter((user) => {
            if(user.socket === socket){
                console.log(`${user.name} 연결 해제`);
                return false;
            }
            return true;
        });
    });
}

// express 실행코드. express 앱 생성 후 http모듈로 서버 생성
const app = express();
const server = createServer(app);

// public 디렉토리의 정적 파일들 serve
app.use('/', express.static('../public'));

// webSocket 리스너 /ws로 추가
const wsApp = expressWs(app, server).app;
wsApp.ws('/ws',handleSocketConnection);

// 서버 시작
const port = process.env.PORT || 3005;
server.listen(port, () => {
    console.log(`서버 스타트.`);
    console.log(`server started on http://localhost:${port}`);
});