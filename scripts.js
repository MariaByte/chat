const DB_URL = 'https://chat-js-efb6b-default-rtdb.europe-west1.firebasedatabase.app/chat';

const userId = "user" + generateRandomString(10)

async function sendMessage(ev) {

    ev.preventDefault();
    const input = document.querySelector('#messageInput');
    const messageText = input.value;
    const replyForm = document.querySelector('#replyMessages');

    if (!messageText.trim()) {
        alert('Сообщение не может быть пустым!');
        return;
    }

    if (replyForm.label == 'Edit') {
      await updateMessage(replyForm.value, "text", messageText);
      document.querySelector('#chatMessages').innerHTML = "";

      displayMessages(await getAllMessages());
    }
    else {
      const message = {
        userId: userId,
        timestamp: Date.now(),
        text: messageText,
        messageId: '',
        replyId: replyForm.value,
    };

      await saveMessage(message);
    }
  
    input.value = "";   
    replyForm.textContent = "";
    replyForm.value = "";
}


async function saveMessage(message) {
  const response = await fetch(`${DB_URL}.json`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: JSON.stringify(message),
});
  
  const idMessage = await response.json();

  await updateMessage(Object.values(idMessage)[0], "messageId");
  return Object.values(idMessage)[0]
}


async function updateMessage(messageId, nameField, bodyField=messageId){
    await fetch(`${DB_URL}/${messageId}.json`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `{"${nameField}": "${bodyField}"}`
  })
}

async function deleteMessage(idMessage) {
  await fetch(`${DB_URL}/${idMessage}.json`, {
  method: 'DELETE'
});
  document.querySelector('#chatMessages').innerHTML = "";

  displayMessages(await getAllMessages());
}

async function getMessageById(idMessage) {
  const response = await fetch(`${DB_URL}/${idMessage}.json`);
  const data = await response.json();

  return data;
}

async function getAllMessages() {
    const response = await fetch(`${DB_URL}.json`);
    const data = await response.json();

    if (!data) {
        return [];
    }

    return Object.values(data);
}


function onNewMessages(cb) {
    // Установка EventSource соединения
    const eventSource = new EventSource(`${DB_URL}.json`);
  
    // Обработка событий от сервера
    eventSource.addEventListener("put", (event) => {
    const data = JSON.parse(event.data).data;
      if (!data) {
        
        cb([]);
        return;
      }
      
      if ("text" in data) {
        eventSource.addEventListener("patch", (event) => { 
          const data2 = JSON.parse(event.data).data;
          if (data.messageId == '') {
            data.messageId = Object.values(data2)[0];
          }
        });
        
        cb([data]);
        return [data];
      }

    
    });

    // Обработка ошибок
    eventSource.addEventListener("error", (error) => {
      console.error("Ошибка:", error);
    });
  }


async function displayMessages(messages) {
    const chatBox = document.querySelector('#chatMessages');
    const replyMessages = document.querySelector('#replyMessages');
    
    for (const message of messages) {
      let who = message.userId;

      if (who == userId) {
        who = 'Ты';
      }
      
    // messages.forEach(async (message) => {
        const messageDiv = document.createElement("div");
        if ((message.replyId != "") && (message.replyId != undefined)) {
          const replyData = await getMessageById(message.replyId);
          if (replyData == null) {
            await updateMessage(message.messageId, "replyId", "");
            messageDiv.textContent = `${new Date(
              message.timestamp
          ).toLocaleString()} - ${who}: ${message.text}`;
          }
          else {
            let forWho = replyData.userId;
          if ( forWho == userId) {
            forWho = 'тебе';
          }
          messageDiv.textContent = `${new Date(
            message.timestamp
        ).toLocaleString()} - ${who} ответил ${forWho} на "${replyData.text}": ${message.text}`;
          }
        }
        else {
          messageDiv.textContent = `${new Date(
            message.timestamp
        ).toLocaleString()} - ${who}: ${message.text}`;
        }
        const messageReply = document.createElement("img");
        messageReply.src = './image/reply.png';
        messageReply.alt = 'ответить';
        messageReply.style.opacity = 0;
        messageDiv.appendChild(messageReply);

        const messageDel = document.createElement("img");
        messageDel.src = './image/delete.png';
        messageDel.style.opacity = 0;
        
        if (message.userId == userId) {  
            
          messageDiv.appendChild(messageDel);
          
          messageDel.onclick = async function() {
            await deleteMessage(message.messageId);
          };

        }

        messageReply.onclick = async function() {
          const data = await getMessageById(message.messageId);
          const replyText = `Ваш ответ на сообщение ${data.userId}: "${data.text}"`;  
          replyMessages.textContent = replyText;
          replyMessages.value = data.messageId;

          const cancelReply = document.createElement("img");
          cancelReply.src = './image/delete.png';
          replyMessages.appendChild(cancelReply);
          messageInput.focus(); 

          cancelReply.onclick = function() {
            replyMessages.textContent = "";
            replyMessages.value = "";
            messageInput.focus(); 
          }
          };

        messageDiv.addEventListener("mouseover", function(e) {
          messageDel.style.opacity = 1;
          messageReply.style.opacity = 1;
        });

        messageDiv.addEventListener("mouseleave", function(e) {
          messageDel.style.opacity = 0;
          messageReply.style.opacity = 0;
        });

        messageDiv.addEventListener("dblclick", async function(e) {
          if (message.userId == userId) {
            const data = await getMessageById(message.messageId);
            replyMessages.textContent = 'Редактирование';
            document.querySelector('#sendButton').textContent = "Изменить";
            replyMessages.value = data.messageId;
            replyMessages.label = 'Edit';
            messageInput.value = data.text;
            const cancelReply = document.createElement("img");
            cancelReply.src = './image/delete.png';
            cancelReply.alt = 'удалить';
            replyMessages.appendChild(cancelReply);
            messageInput.focus(); 

            cancelReply.onclick = function() {
              replyMessages.textContent = "";
              replyMessages.value = "";
              replyMessages.label = "";
              messageInput.value = "";
              messageInput.focus(); 
            }
          }
          
        })

        chatBox.appendChild(messageDiv);
    };
    chatBox.scrollTop = chatBox.scrollHeight;
}


function generateRandomString(len) {
    return Array(len+1).join((Math.random().toString(36) + "00000000000000000").slice(2, 18)).slice(0, len);
}

window.onload = async function() {
    displayMessages(await getAllMessages());
    document.querySelector('#sendButton').addEventListener('click', sendMessage);

};
    

onNewMessages((messages) => {
  
    displayMessages(messages);

});
