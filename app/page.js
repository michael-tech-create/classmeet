"use client";

import { db } from "@/config/firebaseConfig";
import { useRef, useState } from "react";
import { addDoc, collection, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

export default function VideoChat() {
  // ✅ State management
  const [callId, setCallId] = useState("");
  const [currentId, setCurrentId] = useState("");
  const [status, setStatus] = useState("Idle...");

  // ✅ Refs for video and connection
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pc = useRef(null);

  // 🔹 Function to start webcam
const startWebcam = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support webcam or microphone access.");
      return null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    // Make sure we assign it to the local video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream; // ✅ always return the stream

  } catch (err) {
    console.error("Error starting webcam:", err);
    alert("Camera or mic access failed: " + err.message);
    return null; // ✅ return null if error happens
  }
};


  // 🔹 Create Call
  const createCall = async () => {
    setStatus("Creating call...");
    const localStream = await startWebcam();
  if (!localStream) {
  console.error("❌ Webcam stream not available.");
  return;
  }

    pc.current = new RTCPeerConnection();

    localStream.getTracks().forEach((track) => pc.current.addTrack(track, localStream));

    const remoteStream = new MediaStream();
    pc.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
    };
    remoteVideoRef.current.srcObject = remoteStream;

    const callDoc = doc(collection(db, "calls"));
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");
    setCurrentId(callDoc.id);

    pc.current.onicecandidate = async (event) => {
      if (event.candidate) await addDoc(offerCandidates, event.candidate.toJSON());
    };

    const offerDescription = await pc.current.createOffer();
    await pc.current.setLocalDescription(offerDescription);

    await setDoc(callDoc, { offer: { sdp: offerDescription.sdp, type: offerDescription.type } });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pc.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.current.setRemoteDescription(answerDescription);
      }
    });

    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.current.addIceCandidate(candidate);
        }
      });
    });

    setStatus("Call created ✅ — Share your Call ID below!");
  };

  // 🔹 Join Call
  const joinCall = async () => {
    setStatus("Joining call...");
    const callDoc = doc(db, "calls", callId);
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");
    const callData = (await getDoc(callDoc)).data();

    const localStream = await startWebcam();
    pc.current = new RTCPeerConnection();

    localStream.getTracks().forEach((track) => pc.current.addTrack(track, localStream));

    const remoteStream = new MediaStream();
    pc.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
    };
    remoteVideoRef.current.srcObject = remoteStream;

    pc.current.onicecandidate = async (event) => {
      if (event.candidate) await addDoc(answerCandidates, event.candidate.toJSON());
    };

    await pc.current.setRemoteDescription(new RTCSessionDescription(callData.offer));
    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);

    await setDoc(callDoc, { answer: { type: answerDescription.type, sdp: answerDescription.sdp } }, { merge: true });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.current.addIceCandidate(candidate);
        }
      });
    });

    setStatus("Connected ✅");
  };

  // 🔹 UI
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 text-center">
        <h2 className="text-2xl font-bold text-indigo-600 mb-4">🎥 ClassMate Video Connect</h2>

        <div className="flex gap-4 mb-4 justify-center">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-44 rounded-xl shadow-md border" />
          <video ref={remoteVideoRef} autoPlay playsInline className="w-44 rounded-xl shadow-md border" />
        </div>

        <p className="text-sm mb-2 font-medium text-gray-600">{status}</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={createCall}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all"
          >
            Create Call
          </button>

          <input
            placeholder="Enter call ID"
            value={callId}
            onChange={(e) => setCallId(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-lg text-black focus:ring focus:ring-indigo-200"
          />

          <button
            onClick={joinCall}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all"
          >
            Join Call
          </button>
        </div>

        {currentId && (
          <div className="mt-4 text-sm text-gray-700">
            Share this ID with your friend:{" "}
            <b className="text-indigo-700 select-all">{currentId}</b>
          </div>
        )}
      </div>
    </main>
  );
}
