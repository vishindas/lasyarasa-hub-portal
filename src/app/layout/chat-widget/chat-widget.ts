import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RasaChatService } from '../../core/services/rasa-chat.service';

interface ChatMsg { role: 'user' | 'bot'; text: string; }

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule],
  styles: [`
    .chat-wrapper { position: fixed; bottom: 24px; right: 24px; z-index: 1000;
      display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }

    .chat-panel { width: 360px; height: 500px; background: #fff; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18); display: flex; flex-direction: column;
      overflow: hidden; }

    .chat-header { display: flex; align-items: center; justify-content: space-between;
      padding: 12px 8px 12px 16px; background: #4a1880; color: #fff; }
    .chat-header-left { display: flex; align-items: center; gap: 10px; }
    .chat-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center; }
    .chat-title { font-size: 15px; font-weight: 600; }
    .chat-subtitle { font-size: 11px; opacity: 0.75; }
    .close-btn { color: #fff !important; }

    .chat-messages { flex: 1; overflow-y: auto; padding: 16px 12px; display: flex;
      flex-direction: column; gap: 10px; }

    .msg-row { display: flex; }
    .msg-row.user { justify-content: flex-end; }

    .msg-bubble { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 13.5px;
      line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .bot-bubble { background: #f3f4f6; color: #1f2937; border-bottom-left-radius: 4px; }
    .user-bubble { background: #4a1880; color: #fff; border-bottom-right-radius: 4px; }

    .typing-indicator { display: flex; align-items: center; gap: 5px; padding: 12px 16px; }
    .typing-indicator span { width: 8px; height: 8px; background: #9ca3af; border-radius: 50%;
      animation: bounce 1.2s infinite; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); } }

    .chat-input-area { display: flex; align-items: center; padding: 8px 8px 8px 12px;
      border-top: 1px solid #e5e7eb; gap: 4px; }
    .chat-input { flex: 1; border: none; outline: none; font-size: 14px; color: #1f2937;
      background: transparent; padding: 6px 0; font-family: inherit; resize: none; }
    .chat-input::placeholder { color: #9ca3af; }
    .chat-input:disabled { opacity: 0.5; }
    .send-btn { color: #4a1880 !important; }
    .send-btn:disabled { color: #d1d5db !important; }

    .fab-btn { background: #4a1880 !important; color: #fff !important;
      width: 56px !important; height: 56px !important; }
  `],
  template: `
    <div class="chat-wrapper">
      @if (open()) {
        <div class="chat-panel">
          <div class="chat-header">
            <div class="chat-header-left">
              <div class="chat-avatar">
                <mat-icon style="font-size:18px;width:18px;height:18px;color:#fff">auto_awesome</mat-icon>
              </div>
              <div>
                <div class="chat-title">LasyaRasa AI</div>
                <div class="chat-subtitle">Indian Classical Dance Expert</div>
              </div>
            </div>
            <button mat-icon-button class="close-btn" (click)="toggle()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="chat-messages" #messageList>
            @for (msg of messages(); track $index) {
              <div class="msg-row" [class.user]="msg.role === 'user'">
                <div class="msg-bubble" [class.user-bubble]="msg.role === 'user'"
                     [class.bot-bubble]="msg.role === 'bot'">{{ msg.text }}</div>
              </div>
            }
            @if (typing()) {
              <div class="msg-row">
                <div class="msg-bubble bot-bubble typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            }
          </div>

          <div class="chat-input-area">
            <input class="chat-input" [(ngModel)]="inputText"
                   (keydown)="onKey($event)"
                   placeholder="Ask about Indian classical dance…"
                   [disabled]="typing()" />
            <button mat-icon-button class="send-btn"
                    (click)="send()"
                    [disabled]="!inputText.trim() || typing()">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </div>
      }

      <button mat-fab class="fab-btn" (click)="toggle()"
              [attr.aria-label]="open() ? 'Close chat' : 'Ask AI'">
        <mat-icon>{{ open() ? 'close' : 'chat' }}</mat-icon>
      </button>
    </div>
  `
})
export class ChatWidgetComponent implements AfterViewChecked {
  private rasa = inject(RasaChatService);

  open = signal(false);
  typing = signal(false);
  messages = signal<ChatMsg[]>([]);
  inputText = '';
  private greeted = false;
  private shouldScroll = false;

  @ViewChild('messageList') private messageListRef!: ElementRef<HTMLElement>;

  toggle() {
    this.open.update(v => !v);
    if (this.open() && !this.greeted) {
      this.greeted = true;
      this.callRasa('hi', true);
    }
  }

  send() {
    const text = this.inputText.trim();
    if (!text || this.typing()) return;
    this.inputText = '';
    this.messages.update(msgs => [...msgs, { role: 'user', text }]);
    this.shouldScroll = true;
    this.callRasa(text, false);
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  private callRasa(text: string, silent: boolean) {
    this.typing.set(true);
    this.rasa.send(text).subscribe({
      next: reply => {
        this.typing.set(false);
        if (reply) {
          this.messages.update(msgs => [...msgs, { role: 'bot', text: reply }]);
          this.shouldScroll = true;
        }
      },
      error: () => {
        this.typing.set(false);
        if (!silent) {
          this.messages.update(msgs => [
            ...msgs,
            { role: 'bot', text: 'Sorry, I\'m having trouble connecting. Please try again.' }
          ]);
          this.shouldScroll = true;
        }
      }
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.messageListRef) {
      this.shouldScroll = false;
      const el = this.messageListRef.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
