import { db } from '../firebase/firebase-config.js';
import { ref, set, get, push, update, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { audio } from './audio.js';

export class OnlineManager {
    constructor(appController) {
        this.app = appController;
        this.username = '';
        this.roomId = null;
        this.isHost = false;
        this.unsubRoom = null;
        this.unsubRoomsList = null;
    }

    init() {
        const btnLogin = document.getElementById('btn-login-online');
        const btnCreate = document.getElementById('btn-create-room');
        const btnLeave = document.getElementById('btn-leave-room');
        const btnBack = document.getElementById('btn-online-back');

        btnLogin.onclick = () => {
            const val = document.getElementById('input-username').value.trim();
            if (val) {
                this.username = val;
                document.getElementById('lobby-auth').classList.add('hidden');
                document.getElementById('lobby-menu').classList.remove('hidden');
                this.listenRooms();
            }
        };

        btnCreate.onclick = () => this.createRoom();
        btnLeave.onclick = () => this.leaveRoom();
        btnBack.onclick = () => {
            if (this.unsubRoomsList) this.unsubRoomsList();
            this.leaveRoom();
            this.app.showScreen('screen-menu');
        };
    }

    listenRooms() {
        const roomsRef = ref(db, 'rooms');
        this.unsubRoomsList = onValue(roomsRef, (snapshot) => {
            const data = snapshot.val();
            const listEl = document.getElementById('room-list');
            listEl.innerHTML = '';
            if (!data) {
                listEl.innerHTML = '<p>Aucun salon disponible.</p>';
                return;
            }
            for (let id in data) {
                const room = data[id];
                if (room.status === 'waiting') {
                    const div = document.createElement('div');
                    div.className = 'room-item';
                    div.innerHTML = `<span>Salon de ${room.host}</span><span>Rejoindre ➔</span>`;
                    div.onclick = () => this.joinRoom(id);
                    listEl.appendChild(div);
                }
            }
        });
    }

    createRoom() {
        const roomsRef = ref(db, 'rooms');
        const newRoomRef = push(roomsRef);
        this.roomId = newRoomRef.key;
        this.isHost = true;

        const roomData = {
            host: this.username,
            status: 'waiting',
            players: {
                [this.username]: { score: 0, ready: true }
            }
        };

        set(newRoomRef, roomData).then(() => {
            this.enterRoomUI();
            this.listenRoomData();
        });
    }

    joinRoom(roomId) {
        this.roomId = roomId;
        this.isHost = false;
        const playerRef = ref(db, `rooms/${roomId}/players/${this.username}`);
        set(playerRef, { score: 0, ready: true }).then(() => {
            this.enterRoomUI();
            this.listenRoomData();
        });
    }

    enterRoomUI() {
        document.getElementById('lobby-menu').classList.add('hidden');
        document.getElementById('lobby-room').classList.remove('hidden');
        document.getElementById('host-name').textContent = this.isHost ? this.username : 'Salon';
        
        // Générer et afficher le lien d'invitation
        const inviteInput = document.getElementById('input-invite-link');
        if (inviteInput && this.roomId) {
            const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
            inviteInput.value = inviteUrl;
        }

        if (this.isHost) {
            document.getElementById('btn-start-room').classList.remove('hidden');
        } else {
            document.getElementById('btn-start-room').classList.add('hidden');
        }
    }

    listenRoomData() {
        const roomRef = ref(db, `rooms/${this.roomId}`);
        this.unsubRoom = onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            const playersUl = document.getElementById('players-ul');
            playersUl.innerHTML = '';
            if (data.players) {
                for (let p in data.players) {
                    const li = document.createElement('li');
                    li.textContent = `• ${p}`;
                    playersUl.appendChild(li);
                }
            }
        });
    }

    leaveRoom() {
        if (this.unsubRoom) {
            this.unsubRoom();
            this.unsubRoom = null;
        }
        if (this.roomId && this.username) {
            const playerRef = ref(db, `rooms/${this.roomId}/players/${this.username}`);
            remove(playerRef);
            this.roomId = null;
        }
        document.getElementById('lobby-room').classList.add('hidden');
        document.getElementById('lobby-menu').classList.remove('hidden');
    }
}
