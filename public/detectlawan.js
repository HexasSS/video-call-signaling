import { GestureRecognizer, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const demosSection = document.getElementById("demos");
let gestureRecognizer;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";

// Load GestureRecognizer and set initial options
const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "sibi.task",
            delegate: "GPU"
        },
        runningMode: runningMode
    });
    demosSection.classList.remove("invisible");
};

createGestureRecognizer();

/********************************************************************
// Adjusted Demo: Continuously grab image from remote video stream and detect it.
********************************************************************/
const remoteVideo = document.getElementById("remoteVideo");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput = document.getElementById("gesture_output");

// Check if webcam access is supported (though now we're using remote video)
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Initialize the detection process when remote video is ready
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", toggleDetection);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

// Toggle the gesture detection from the remote video
function toggleDetection(event) {
    if (!gestureRecognizer) {
        alert("Please wait for gestureRecognizer to load");
        return;
    }

    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE PREDICTIONS";
        stopVideoStream(remoteVideo);
    } else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE PREDICTIONS";
        startVideoDetection(remoteVideo);
    }
}

// Function to start detection on the remote video
function startVideoDetection(videoElement) {
    videoElement.addEventListener("loadeddata", predictRemoteVideo);
}

// Function to stop the video stream
function stopVideoStream(videoElement) {
    const stream = videoElement.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
}

let lastVideoTime = -1;
let results = undefined;

// Function to handle gesture detection from the remote video
async function predictRemoteVideo() {
    // Set to running mode VIDEO if not already set
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }

    let nowInMs = Date.now();
    if (remoteVideo.currentTime !== lastVideoTime) {
        lastVideoTime = remoteVideo.currentTime;
        results = gestureRecognizer.recognizeForVideo(remoteVideo, nowInMs);
    }

    // Draw results on canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);
    canvasElement.style.height = videoHeight;
    remoteVideo.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    remoteVideo.style.width = videoWidth;

    if (results.landmarks) {
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
            });
        }
    }

    canvasCtx.restore();

    if (results.gestures.length > 0) {
        gestureOutput.style.display = "block";
        gestureOutput.style.width = videoWidth;
        const categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(results.gestures[0][0].score * 100).toFixed(2);
        const handedness = results.handednesses[0][0].displayName;
        gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
    } else {
        gestureOutput.style.display = "none";
    }

    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictRemoteVideo);
    }
}
