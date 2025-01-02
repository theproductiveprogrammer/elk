import {
	LogInfo as loginfo,
	LogWarning as logwarning,
	LogError as logerror,
} from "../wailsjs/go/main/App";

export function LogInfo(message: string) {
	console.log(message);
	loginfo("<- " + message);
}

export function LogWarning(message: string) {
	console.warn(message);
	logwarning("<- " + message);
}
export function LogError(message: string) {
	console.error(message);
	logerror("<- " + message);
}
