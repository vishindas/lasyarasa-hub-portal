import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface RasaMessage {
  recipient_id: string;
  text?: string;
}

@Injectable({ providedIn: 'root' })
export class RasaChatService {
  private readonly endpoint = 'https://app.lasyarasahub.com/webhooks/rest/webhook';
  private readonly senderId = this.getOrCreateSenderId();

  constructor(private http: HttpClient) {}

  send(message: string): Observable<string> {
    return this.http
      .post<RasaMessage[]>(this.endpoint, { sender: this.senderId, message })
      .pipe(map(msgs => msgs.map(m => m.text).filter(Boolean).join('\n\n')));
  }

  private getOrCreateSenderId(): string {
    const key = 'lasyarasa_chat_sender_id';
    let id = localStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
    return id;
  }
}
