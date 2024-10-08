
var peerRTC = null;
var sendChannel = null;
var localStream = null;
var mySocket = null;
var senders = [];
const clientId = randomId(10);
const CAMERA_ID = "camera_id_6732";

const localVideo = document.getElementById('local_video');
const remoteVideo = document.getElementById('remote_video');
var outputInfo = document.getElementById('output_info');
var candidateInfo = document.getElementById('candidate_info');
var sdpRemote = document.getElementById('sdp_remote');
var sdpLocal = document.getElementById('sdp_local');

localVideo.style.display = "none";
remoteVideo.style.display = "none";

localVideo.addEventListener('loadedmetadata', function () {
	console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('loadedmetadata', function () {
	console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('resize', () => {
	console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`);
	outputInfo.innerHTML = `摄像头视频分辨率 ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`;
	// We'll use the first onsize callback as an indication that video has started
	// playing out.
	/*if (startTime) {
	  const elapsedTime = window.performance.now() - startTime;
	  console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
	  startTime = null;
	}*/
});


navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia || navigator.msGetUserMedia;

function getDeviceStream(option) {
	console.log('navigator getUserMadia start');
	if ('getUserMedia' in navigator.mediaDevices) {
		console.log('navigator.mediaDevices.getUserMadia');
		return navigator.mediaDevices.getUserMedia(option);
	}
	else {
		console.log('wrap navigator.getUserMadia with Promise');
		return new Promise(function (resolve, reject) {
			navigator.getUserMedia(option,
				resolve,
				reject
			);
		});
	}
}

function stopLocalStream(stream) {
	let tracks = stream.getTracks();
	if (!tracks) {
		console.warn('NO tracks');
		return;
	}
	for (let track of tracks) {
		track.stop();
	}
}


function add_track(kind) {
	if (!localStream) {
		return;
	}
	if (!peerRTC) {
		return;
	}

	let track = null;
	if (kind === 'video') {
		track = localStream.getVideoTracks()[0];
	}
	else if (kind === 'audio') {
		track = localStream.getAudioTracks()[0];
	}
	else {
	}
	let sender = peerRTC.addTrack(track, localStream); // same stream
	senders[kind] = sender;
	console.log("-----add track end-------");
}


function playVideo(element, stream) {
	if ('srcObject' in element) {
		if (!element.srcObject) {
			element.srcObject = stream;
		}
		else {
			console.log('stream alreay playnig, so skip');
		}
	}
	else {
		element.src = window.URL.createObjectURL(stream);
	}
	element.play();
	element.volume = 0;
}

function pauseVideo(element) {
	element.pause();
	if ('srcObject' in element) {
		element.srcObject = null;
	}
	else {
		if (element.src && (element.src !== '')) {
			window.URL.revokeObjectURL(element.src);
		}
		element.src = '';
	}
}

function removeTrack(kind) {
	console.log('removing track kind=' + kind);
	if (!peerRTC) {
		return;
	}
	let sender = senders[kind];
	if (sender) {
		peerRTC.removeTrack(sender);
		delete senders[kind];
		sender = null;
	}
	else {
		console.warn('NO sender for kind=' + kind);
	}
}

function onSetSessionDescriptionError(error) {
	console.log(`Failed to set session description:`);
}


function onCreateSessionDescriptionError(error) {
	console.log(`Failed to create session description: ${error.toString()}`);
}

function getName(pc) {
	return pc.toString();
}

function onSetLocalSuccess(pc) {
	console.log(`${getName(pc)} setLocalDescription complete`);
}

function onSetRemoteSuccess(pc) {
	console.log(`${getName(pc)} setRemoteDescription complete`);
}


function webrtc_init() {
	if (location.protocol === 'https:') {
		getDeviceStream({
			video: {
				width: { ideal: 1280 },
				height: { ideal: 720 }
			}
		}) // audio: false
			.then(function (stream) { // success
				console.log('local Stream', stream);
				localStream = stream;
				playVideo(localVideo, stream);
				add_track('video');
				localVideo.style.display = "block";
			}).catch(function (error) { // error
				console.error('getUserMedia error:', error);
				return;
			});
	}

	RTCPeerConnection.getSelectedCandidatePair = function() {
	  // Returns the currently selected ICE candidate pair.
	  // If no candidate pair has been selected, returns null.
	  return this._selectedCandidatePair;
	};

	peerRTC = new RTCPeerConnection({
		// Recommended for libdatachannel
		bundlePolicy: 'max-bundle',
		//offerToReceiveAudio: 0,
		//offerToReceiveVideo: 1,
		iceServers: [
			{ 'urls': 'stun:stun.l.google.com:19302' },
			{ 'urls': 'stun:stun1.l.google.com:19302' },
			{ 'urls': 'stun:stun2.l.google.com:19302' },
			{ 'urls': 'stun:stun3.l.google.com:19302' }
		]
	});


	// 当新的候选对发生变化时，触发selectedcandidatepairchange事件
	peerRTC.onselectedcandidatepairchange = function(event) {
	  // 获取当前的候选对
	  var candidatePair = event.candidatePair;

	  // 获取本地和远程候选者
	  var localCandidate = candidatePair.localCandidate;
	  var remoteCandidate = candidatePair.remoteCandidate;

	  // 打印出候选者的信息
	  console.log("Local candidate: " + localCandidate.ipAddress + ":" + localCandidate.portNumber);
	  console.log("Remote candidate: " + remoteCandidate.ipAddress + ":" + remoteCandidate.portNumber);
	};



	peerRTC.onconnectionstatechange = () => {
		if (peerRTC.connectionState === 'connected') {
			//const tracks = peerRTC.getReceivers().map(r => r.track);
			//const stream = new MediaStream(tracks);
			outputInfo.innerHTML = "WebRTC建立连接OK";
			//console.log("selectedCandidatePair", peerRTC);

			peerRTC.getTransceivers().forEach((transceiver) => {
			  //transceiver.stop();
			  console.log("getTransceivers1", transceiver);
			  //console.log("getTransceivers2", transceiver.getSelectedCandidatePair());
			  transceiver.onselectedcandidatepairchange = function(event) {
					  var pair = transceiver.getSelectedCandidatePair();
					  console.log("pair ", pair);
					  //localProtocol.innerText = pair.local.protocol.toUpperCase();
					  //remoteProtocol.innerText = pair.remote.protocol.toUpperCase();
				}
			});

			//var iceTransport = peerRTC.getTransceivers()[0].transport.iceTransport;

			// 获取webrtc选定的候选对
			//var selectedCandidatePair = peerRTC.getSelectedCandidatePair();

			//console.log("selectedCandidatePair", selectedCandidatePair);

			// 获取候选对的本地和远程信息
			/*var localCandidate = selectedCandidatePair.local;
			var remoteCandidate = selectedCandidatePair.remote;

			candidateInfo.innerHTML = "本地:" + localCandidate.ip+":"+localCandidate.port+", 远端:"+remoteCandidate.ip+":"+remoteCandidate.port;
			*/

			peerRTC.getStats().then((stats) => {
				// Iterate through the stats and log them
				stats.forEach(stat => {
					console.log("stat: ", stat);
				});
			});
		}
		else if (peerRTC.connectionState === 'disconnected') {
			outputInfo.innerHTML = "WebRTC已经断开!";
		}
		else {
		}
		console.log("local onconnectionstatechange: " + peerRTC.connectionState);
	}

	// send any ice candidates to the other peer
	peerRTC.onicecandidate = function (evt) {
		console.log("local onicecandidate: " + JSON.stringify({ "candidate": evt.candidate }));
		var cand = {};
		cand.cmd = "webrtc_candidate";
		cand.id = clientId;
		cand.to = CAMERA_ID;
		if (evt.candidate) {
			cand.candidate = evt.candidate.candidate;
			cand.sdpMid = evt.candidate.sdpMid;
			cand.sdpMLineIndex = evt.candidate.sdpMLineIndex;
		}
		else {
			cand.candidate = null;
		}
		signaling_send(cand);
	};

	peerRTC.onicecandidateerror = function (e) {
		console.log("local onicecandidateerror: " + JSON.stringify(e));
	};

	peerRTC.ondatachannel = function (evt) {
		const channel = evt.channel;
		console.log("local ondatachannel: " + JSON.stringify(evt));
	};

	peerRTC.onaddstream = function (evt) {
		console.log("local onaddstream: " + JSON.stringify(evt));
	};

	peerRTC.onnegotiationneeded = async (evt) => {
		console.log("local onnegotiationneeded: " + JSON.stringify(evt));
	};

	peerRTC.onicegatheringstatechange = (state) => {
		console.log("--> local iceGatheringState: " + peerRTC.iceGatheringState);
		if (peerRTC.iceGatheringState === 'complete') {
			// We only want to provide an answer once all of our candidates have been added to the SDP.
			const answer = peerRTC.localDescription;

			console.log("localDescription type: " + answer.type);
			//document.querySelector('textarea').value = answer.sdp;
			sdpLocal.innerHTML = answer.sdp;

			var cmdbody = {
				"cmd": "webrtc_set_sdp",
			};
			cmdbody.type = answer.type;
			cmdbody.sdp = answer.sdp;
			cmdbody.id = clientId;
			cmdbody.to = CAMERA_ID;
			signaling_send(cmdbody);
		}
		else {
		}
	}

	peerRTC.ontrack = (evt) => {
		const track = evt.track;
		//const stream = evt.streams[0];				

		if (track.kind === 'video') {
		}
		else if (track.kind === 'audio') {
		}

		if (!remoteVideo.srcObject) {
			console.log("local play ontrack: kind " + track.kind);
			remoteVideo.srcObject = evt.streams[0];
			remoteVideo.play();
			outputInfo.innerHTML = "正在显示视频...";
			remoteVideo.style.display = "block";
		}
		else {
			console.log("local exist ontrack: kind " + track.kind);
		}

		evt.streams[0].onremovetrack = function (evt_r) {
			const track = evt_r.track;
			console.log("local onremovetrack: kind " + track.kind);

			if (track.kind === 'video') {
			}
			else if (track.kind === 'audio') {
			}
		};
	};


	sendChannel = peerRTC.createDataChannel("browserChannel");
	//sendChannel = peerRTC.createDataChannel("sendDataChannel", {reliable: false});
	sendChannel.onopen = (event) => {
		console.log('Data Channel opened' + JSON.stringify(event));
		sendChannel.send('Hi from browser!');
	}
	sendChannel.onclose = (event) => {
		console.log('Data Channel closed');
	}
	sendChannel.onmessage = (event) => {
		console.log("recv: " + JSON.stringify(event));
		console.log("recv: " + event.data);
	}
}


async function waitGatheringComplete() {
	return new Promise((resolve) => {
		if (peerRTC.iceGatheringState === 'complete') {
			resolve();
		} else {
			peerRTC.addEventListener('icegatheringstatechange', () => {
				if (peerRTC.iceGatheringState === 'complete') {
					resolve();
				}
			});
		}
	});
}

async function webrtc_connect(desc) {

	try {
		sdpRemote.innerHTML = desc.sdp;
		await peerRTC.setRemoteDescription(desc);
		console.log("--333--------------");
		//
		const answer = await peerRTC.createAnswer();
		console.log("browser answer: " + JSON.stringify(answer));
		await peerRTC.setLocalDescription(answer);

		//await waitGatheringComplete();

		//
		onSetLocalSuccess(peerRTC);
		console.log("--555--------------");
	} catch (e) {
		onSetSessionDescriptionError(e);
		console.log("--error--", desc);
	}

}

function signaling_send(msg) {
	var text = JSON.stringify(msg);
	console.log("signaling_send: --> " + text);
	mySocket.send(text);
}

$(document).ready(function () {

	var _default_websocket_url = (location.protocol === 'https:' ? 'wss:' : 'ws:') + location.host + '/rws/ws';
	//var proto = ["webrtc.cwebsocket", "app.cwebsocket"];
	//_default_websocket_url = 'ws://192.168.16.236:8000/server';
	console.log("websocket url: " + _default_websocket_url);
	mySocket = new WebSocket(_default_websocket_url);
	mySocket.onmessage = function (e) {
		var evt = JSON.parse(e.data);
		if (evt.cmd == 'webrtc_set_sdp') {
			console.log("--set sdp--------------");
		}
		else if (evt.cmd == 'webrtc_request_offer') {
			console.log("--receive offer--------------", evt);
			//webrtc_connect(evt);
			outputInfo.innerHTML = "正在建立连接,请等待...";
		}
		else if (evt.cmd == 'event-notify') {
			if (evt.event == 'webrtc_sdp') {
				outputInfo.innerHTML = "收到SDP，急速连接中...";
				webrtc_connect(evt);
				console.log("--receive sdp--------------", evt);
			}
			else {
				console.log("--receive event--------------", evt);
			}
		}
		else {
			//console.log("--> unknow ws recv:", e.data);
		}
	}

	mySocket.onclose = function () {
		outputInfo.innerHTML = "websocket已经断开";
	}
	mySocket.onopen = function () {
		var cmdbody = {};
		cmdbody.cmd = "webrtc_auth"; //登录
		cmdbody.id = clientId;
		//console.log("--> " + JSON.stringify(cmdbody));
		signaling_send(cmdbody);
		outputInfo.innerHTML = "websocket已经连接";
		webrtc_init();
	}


	$("#webrtc_btn").click(function () {
		console.log("---------CALL WEBRTC START----------------");
		var cmdbody = {};
		cmdbody.cmd = "webrtc_request_offer";
		cmdbody.id = clientId;
		cmdbody.to = CAMERA_ID;
		signaling_send(cmdbody);
	});

	$("#cmd_btn").click(function () {
		var cmdbody = $("#cmdbody").val();
		console.log("CMD " + cmdbody);
		if (sendChannel) {
			sendChannel.send(cmdbody);
		}
	});


});

function randomId(length) {
	const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	const pickRandom = () => characters.charAt(Math.floor(Math.random() * characters.length));
	return [...Array(length)].map(pickRandom).join('');
}

