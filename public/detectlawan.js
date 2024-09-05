import { GestureRecognizer, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

let gestureRecognizer;
let runningMode = "IMAGE";
let detectionRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
const remoteVideo = document.getElementById("remoteVideo"); // Use existing remoteVideo

// Before we can use GestureRecognizer, we must wait for it to finish loading.
const createGestureRecognizer = async () => {
    try {
        console.log('Initializing Gesture Recognizer...');
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "sibi.task",
                delegate: "GPU"
            },
            runningMode: runningMode
        });
        console.log('Gesture Recognizer initialized.');
    } catch (error) {
        console.error("Error initializing GestureRecognizer:", error);
    }
};
createGestureRecognizer();

const toggleDetection = async () => {
    if (!gestureRecognizer) {
        alert("Please wait for gestureRecognizer to load");
        return;
    }
    
    detectionRunning = !detectionRunning;
    const buttonText = detectionRunning ? "DISABLE DETECTION" : "ENABLE DETECTION";
    document.getElementById("toggleDetectionButton").innerText = buttonText;

    if (detectionRunning) {
        console.log('Starting detection...');
        remoteVideo.addEventListener("loadeddata", predictWebcam);
        remoteVideo.play();
    } else {
        console.log('Stopping detection...');
        const stream = remoteVideo.srcObject;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            remoteVideo.srcObject = null;
        }
    }
};

async function predictWebcam() {
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }

    let nowInMs = Date.now();
    const results = await gestureRecognizer.recognizeForVideo(remoteVideo, nowInMs);

    console.log('Recognition results:', results);

    const canvasElement = document.getElementById("output_canvas");
    const canvasCtx = canvasElement.getContext("2d");
    const gestureOutput = document.getElementById("gesture_output");

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

    if (detectionRunning) {
        window.requestAnimationFrame(predictWebcam);
    }
}

document.getElementById("toggleDetectionButton").addEventListener("click", toggleDetection);
