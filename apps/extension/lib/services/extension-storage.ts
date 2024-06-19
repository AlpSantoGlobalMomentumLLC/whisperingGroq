import { Schema as S } from '@effect/schema';
import { Storage, type StorageWatchCallback } from '@plasmohq/storage';
import { RecorderState, WhisperingError } from '@repo/shared';
import { Console, Effect } from 'effect';
import { renderErrorAsToast } from '~lib/errors';
import { ToastServiceBgswLive } from './ToastServiceBgswLive';

const keys = [
	'whispering-recording-state',
	'whispering-latest-recording-transcribed-text',
] as const;

type Key = (typeof keys)[number];

const storage = new Storage();

const createSetWatch = <A, I>({ key, schema }: { key: string; schema: S.Schema<A, I> }) => {
	const parseValueFromStorage = (valueFromStorage: unknown) => {
		const jsonSchema = S.parseJson(schema);
		return S.decodeUnknown(jsonSchema)(valueFromStorage);
	};
	return {
		set: (value: A) => Effect.promise(() => storage.set(key, value)),
		watch: (callback: (newValue: A) => void) => {
			const listener: StorageWatchCallback = ({ newValue: newValueUnparsed }) =>
				Effect.gen(function* () {
					const newValue = yield* parseValueFromStorage(newValueUnparsed).pipe(
						Effect.mapError(
							(error) =>
								new WhisperingError({
									title: 'Unable to parse storage value',
									description: error instanceof Error ? error.message : `Unknown error: ${error}`,
									error,
								}),
						),
					);
					yield* Console.info('watch', key, newValue);
					callback(newValue);
				}).pipe(
					Effect.catchAll(renderErrorAsToast),
					Effect.provide(ToastServiceBgswLive),
					Effect.runSync,
				);
			return Effect.sync(() => storage.watch({ [key]: listener }));
		},
	};
};

export const extensionStorageService = {
	'whispering-recording-state': createSetWatch({
		key: 'whispering-recording-state',
		schema: RecorderState,
	}),
	'whispering-latest-recording-transcribed-text': createSetWatch({
		key: 'whispering-latest-recording-transcribed-text',
		schema: S.String,
	}),
} as const;
