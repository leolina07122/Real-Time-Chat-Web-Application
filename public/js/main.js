const chatForm = document.getElementById('chat-form');
const socket = io();
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const button = document.getElementById('button');



// Get osInfo
socket.on('osInfo', data => {
    // console.log(data); // Log the entire received data object
    const { osNet, osCpu, ipv6Address } = data;
});

// Get username and room from url
const {username , room} = Qs.parse(location.search, {ignoreQueryPrefix: true});

//  Join chatroom
socket.emit('joinRoom', {username, room});

//   Get users and room
socket.on('roomUsers', ({room, users}) => {
    outputRoomName(room);
    outputUsers(users);
})

// console.log(username,room);
// Message from server
socket.on('message', message =>{
    // console.log(message);
    outputMessage(message);

    //  Scroll down
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit
button.addEventListener('click', (e) => {
    e.preventDefault();

    //  Get message text
    const msg = chatForm.elements.msg.value;
    // console.log(msg);

    //  Emit message to server
    socket.emit('chatMessage', msg);

    //  Clear input
    chatForm.elements.msg.value = '';
    chatForm.focus();

})

//  Output message
function outputMessage(message){
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<p class="meta">${message.username}<span>${message.time}</span></p>
    <p class="text">
       ${message.text}
    </p>`;
    document.querySelector('.chat-messages').appendChild(div);
}
//   Add room name to DOM
function outputRoomName(room){
    roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users){

    users.forEach(user => {
        getUserName = user.username;
        userList.innerHTML += `<li>${getUserName}</li>`;
        // console.log(getUserName);
    });
    // userList.innerHTML = `
    // ${users.map(user => `<li>${user.username}</li>`).join('')}`;

}

// Received data from index.html
const urlParams = new URLSearchParams(window.location.search);
const username_from = urlParams.get('username');
const room_from = urlParams.get('room');

console.log(username_from);
console.log(room_from);
