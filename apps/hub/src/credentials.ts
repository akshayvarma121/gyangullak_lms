import { invoke } from '@tauri-apps/api/core';

export async function setCredential(service: string, username: string, password: string): Promise<void> {
  await invoke('set_credential', { service, username, password });
}

export async function getCredential(service: string, username: string): Promise<string> {
  return await invoke('get_credential', { service, username });
}

export async function deleteCredential(service: string, username: string): Promise<void> {
  await invoke('delete_credential', { service, username });
}
