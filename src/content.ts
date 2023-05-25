import type { Icon } from '~background/setIcon';
import { writeText } from '~lib/apis/clipboard';
import { startRecording, stopRecording } from '~lib/recorder/mediaRecorder';
import { getApiKey } from '~lib/stores/apiKey';
import { transcribeAudioWithWhisperApi } from '~lib/transcribeAudioWithWhisperApi';

export {};

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
	if (request.name === 'startRecording') {
		await startRecording();
		switchIcon('octagonalSign');
	} else if (request.name === 'stopRecording') {
		const audioBlob = await stopRecording();
		switchIcon('arrowsCounterclockwise');
		const apiKey = await getApiKey();
		const text = await transcribeAudioWithWhisperApi(audioBlob, apiKey);
		writeText(text);
		switchIcon('studioMicrophone');
		sendResponse({ text });
	}
	return true;
});

function switchIcon(icon: Icon) {
	chrome.runtime.sendMessage({ icon });
}