$(function() {
  var FADE_TIME = 150;
  var TYPING_TIMER_LENGTH = 400;

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); 
  var $messages = $('.messages'); 
  var $inputMessage = $('.inputMessage'); 

  var $loginPage = $('.login.page'); 
  var $chatPage = $('.chat.page'); 
  let userLoggedIn;
  var groupList = [];
  var grpCreateClickFlag= false;

  var username;
  var toUser;
  var toGroup;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();
  var usersList = [];
  var copyusersList = [];
  var userChats = [];
  var socket = io();

  setUsername();
  $(".btn-create-group").click((event)=>{
    $(".group-details").toggle();
  })

  $(".search-bar").keypress(function(event){
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if(keycode == '13'){
      $(".search-btn").click();
    }
  });

  $(".search-btn").click((event) => {
    copyusersList = usersList;
    let srchTxt = $(".search-bar").val();
    if(srchTxt !== '') {
      let filteredUserList = [];
      usersList.filter((user)=>{
        let username = user.user;
        if(username.indexOf(srchTxt) != -1){
          console.log(srchTxt + " found in " + username);
          filteredUserList.push(user);
        }
      });
      drawUsersList(filteredUserList);
    } else {
      drawUsersList(usersList);
    }
  });

  function addParticipantsMessage (data) {
  }

  // Sets the client's username
  function setUsername () {
     let userLoggedInUser = localStorage.getItem('user');
     let userLoggedIn =localStorage.getItem('userLoggedIn');
  
    if (userLoggedInUser !== null) {
      username = userLoggedInUser; 
    }  else {
      username = cleanInput($usernameInput.val().trim());
     }

    // If the username is valid
    if (username) {
      $loginPage.hide();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      let data = {
        username: username,
        userLoggedIn: userLoggedIn? userLoggedIn : ''
      }
      // Tell the server your username
      socket.emit('add user', data);
    }
  }

  // Sends a chat message
  function sendMessage () {
    userLoggedIn = localStorage.getItem('userLoggedIn');
    var message = $inputMessage.val();
    
    
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      if(toUser !== '' && toUser !== undefined) {
        addChatMessage({
          username: username,
          message: message,
          userId: userLoggedIn,
          toUserid: toUser,
          stime: Date.now(),
          read:false
        }, 'sender');

        userChats.push({
          username: username,
          message: message,
          fromUserId: userLoggedIn,
          toUserid: toUser,
          stime: Date.now(),
          read:false
        });

        localStorage.setItem('chat', JSON.stringify(userChats));
        socket.emit('private message', {
          message: message,
          fromUserId: userLoggedIn,
          toUserid: toUser,
          read: false
        });
      } else if(toGroup !== '' && toGroup !== undefined) {
        
        // Save msg in groupList object
        groupList.forEach((grp)=>{
          if(grp.groupId === toGroup) {
            let grpObj = {
              message: message,
              fromUserId: userLoggedIn,
              groupId: toGroup,
              read: false,
              type:'sender',
              dateTime: Date.now()
            }
            grp.chat.push(grpObj);
          }
        });
        // ------------------------------

        socket.emit('group message send', {
          message: message,
          fromUserId: userLoggedIn,
          groupId: toGroup,
          read: false
        });

        addChatMessage({
          message: message,
          fromUserId: userLoggedIn,
          groupId: toGroup,
          read:false
        }, 'sender');
      }
      
    }
  }

  // Draw users list
  function drawUsersList (loggedUserList = '') {
    let usersListArray = [];
    if(loggedUserList === '') {
      usersListArray = usersList;
    } else {
      usersListArray = loggedUserList;
    }

    let userDiv = '';
    usersListArray.forEach(user => {
      if(userLoggedIn!== undefined && user.id !== userLoggedIn) {
        
        userDiv += '<div class="chat_list chat_ele" id="'+ user.id +'" data-isgroup="false">';
        userDiv += '<div class="chat_people">';
        userDiv += '<div class="chat_img"> <img src="./assets/images/user-profile.png" alt="image"> </div>';
        userDiv += '<div class="chat_ib">';
        userDiv += '<h5>'+user.user+'<span class="badge d-none" id="badge'+user.id+'"></span></h5>';     
        userDiv += '</div>';
        userDiv += '</div>';
        userDiv += '</div>';    
      }
    });
    
    $('.inbox_chat').html(userDiv);
    chatElementClick();
  }

  function setAddUsersList()
  {
    let userDiv = '<button class="btn btn-sm btn-success p-1 create-grp" style="float: left; ">Create</button>';

    usersList.forEach(user => {
      if(userLoggedIn!== undefined && user.id !== userLoggedIn) {
        
        userDiv += '<div class="chat_list">';
        userDiv += '<div class="chat_people">';
        userDiv += '<div class="chat_img"> <img src="./assets/images/user-profile.png" alt="image"> </div>';
        userDiv += '<div class="chat_ib">';
        userDiv += '<h5>'+user.user+'<input type="checkbox" style="float:right" class="add-user-chk" data-userid="'+user.id+'" /></h5>';
        userDiv += '</div>';
        userDiv += '</div>';
        userDiv += '</div>';        
      }
      
    });
    
    $('#addusersList').html(userDiv);
    var grpUsers = userLoggedIn + ',';
    $(".add-user-chk").click((event)=> {
      // console.log("event add-user-chk::: ", event.target.attributes['data-userid'].value);

      grpUsers += event.target.attributes['data-userid'].value+',';
    });
    
    
    $('.create-grp').click((event) => {
      
     let grpName = $("#grpName").val();
        // if(!grpCreateClickFlag) {
          socket.emit('create group', {
            grpName: grpName,
            grpUsers: grpUsers,
            admin: userLoggedIn,
            adminName: localStorage.getItem('user'),
            adminSocketId: localStorage.getItem('socketId')
          });
        // }
        grpCreateClickFlag = true;
    });
  }

  socket.on('group message received', function (data) {
    console.log("===group message received test=======", data);
    console.log("======toGroup=====", toGroup);
    
    if(toGroup === data.groupId) {
      addChatMessage({
        username: username,
        message: data.message,
        userId: data.fromUserId,
        fromUserName: data.fromUserName,
        toUserid: data.groupId,
        dateTime: Date.now(),
        read:false
      }, 'receiver');
    }

    // save chat in groupList object
    groupList.forEach((grp)=>{
      if(grp.groupId === data.groupId) {
        let grpObj = data;
        grpObj['type']='receiver';
        grpObj['dateTime'] = Date.now();
        grp.chat.push(grpObj);
      }
    });
    // ----------------------------

  });
  
  socket.on('group created', function (data) {
    console.log("=====group created====", data);
    if(groupList == null) {
      groupList = [];
    }
    groupList.push(data);
    console.log("===group list=== ", groupList);
    
    userDiv = '';
    userDiv += '<div class="chat_list chat_ele" id="'+data.groupId+'" data-isgroup="true">';
    userDiv += '<textarea class="group-object" style="display:none">'+JSON.stringify(data)+'</textarea>';
    userDiv += '<div class="chat_people">';
    userDiv += '<div class="chat_img"> <img src="./assets/images/group.svg" alt="group"> </div>';
    userDiv += '<div class="chat_ib">';
    userDiv += '<h5>'+data.grpName+'<span class="badge d-none" id="badge'+data.groupId+'"></span></h5>';
    userDiv += '</div>';
    userDiv += '</div>';
    userDiv += '</div>';    
    $('.inbox_chat').append(userDiv);

    chatElementClick();

    

  });


  function setMessageHistory(chatObj, isGroup='false') { // toUser
    console.log("setMessageHistory")
    let userlogid = userLoggedIn;
    let msgHistory = ''
    
    if(isGroup === 'false') {
      usersList.forEach((user)=> {
        if (user.id === chatObj) {
          console.log('==current user==', user);
          $("#userHeading").text(user.user);
        }
      });

      $("#msg_history").html('');
      userChats.forEach((chat) => {
        chat.read = true;
        $("#badge"+chatObj).addClass("d-none");
        if (chat.fromUserId === userlogid && chat.toUserid === chatObj ) {
          msgHistory += '<div class="outgoing_msg">'; 
          msgHistory += '<div class="sent_msg">';
          msgHistory += '<p>'+chat.message+'</p>';
          // outgoing_msg += '<span class="time_date"> 11:01 AM    |    June 9</span>';
          msgHistory += '</div></div>';
        } else if(chat.toUserid === userlogid && chat.fromUserId === chatObj) {
          msgHistory += '<div class="incoming_msg">';
          msgHistory += '<div class="incoming_msg_img"> <img src="./assets/images/user-profile.png" alt="image"> </div>';
          msgHistory += '<div class="received_msg">';
          msgHistory += '<div class="received_withd_msg">';
          msgHistory += '<p>'+chat.message+'</p>';
              // <span class="time_date"> 11:01 AM    |    June 9</span></div>
          msgHistory += '</div></div>';
          msgHistory += '</div>';
        }

      });
      msgHistory += '';
      $("#msg_history").append(msgHistory);
    } else {
      $("#msg_history").html('');
      let groupInfo;
      groupList.forEach((grp)=>{
        if(grp.groupId === toGroup) {
          groupInfo = grp;
        }
      });
      $("#userHeading").text(groupInfo.grpName);
      let groupChat = groupInfo.chat;
      console.log("===groupChat===", groupChat);
      groupChat.forEach((chat) => {
        chat.read = true;
        let chatDate = new Date(chat.dateTime);
        let  strdatetime =  chatDate.getDate() + "/"
                  + (chatDate.getMonth()+1)  + "/" 
                  + chatDate.getFullYear() + " @ "  
                  + chatDate.getHours() + ":"  
                  + chatDate.getMinutes() + ":" 
                  + chatDate.getSeconds(); 

        $("#badge"+toGroup).addClass("d-none");
        if (chat.type ==='sender') {
          msgHistory += '<div class="outgoing_msg">'; 
          msgHistory += '<div class="sent_msg">';
          msgHistory += '<p>'+chat.message+'</p>';
          msgHistory += '<span class="time_date">Me    |    '+ strdatetime +'</span>'; 
          msgHistory += '</div></div>';
        } else if(chat.type === 'receiver') {
          msgHistory += '<div class="incoming_msg">';
          msgHistory += '<div class="incoming_msg_img"> <img src="./assets/images/user-profile.png" alt="image"> </div>';
          msgHistory += '<div class="received_msg">';
          msgHistory += '<div class="received_withd_msg">';
          msgHistory += '<p>'+chat.message+'</p>';
          msgHistory += '<span class="time_date">'+chat.fromUserName+'   |    '+ strdatetime +'</span>'; 
              // <span class="time_date"> 11:01 AM    |    June 9</span></div>
          msgHistory += '</div></div>';
          msgHistory += '</div>';
        }

      });
      $("#msg_history").append(msgHistory);

    }
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    console.log("in addChatMessage", data);
    data.read = true;
    let currentdate = new Date();
    let  strdatetime =  currentdate.getDate() + "/"
              + (currentdate.getMonth()+1)  + "/" 
              + currentdate.getFullYear() + " @ "  
              + currentdate.getHours() + ":"  
              + currentdate.getMinutes() + ":" 
              + currentdate.getSeconds(); 
    // setBadge(data);
    // $("#badge"+data.toUserid).addClass("d-none");
    if(options === 'sender') {
      let outgoing_msg = '<div class="outgoing_msg">'; 
      outgoing_msg += '<div class="sent_msg">';
      outgoing_msg += '<p>'+data.message+'</p>';
      outgoing_msg += '<span class="time_date">Me    |    '+ strdatetime +'</span>'; // <span class="time_date"> 11:01 AM    |    June 9</span>
      outgoing_msg += '</div></div>';
      $("#msg_history").append(outgoing_msg);
    } else {
      console.log("=====incoming message=====", data);
      
      let incoming_msg = '<div class="incoming_msg">';
      incoming_msg += '<div class="incoming_msg_img"> <img src="./assets/images/user-profile.png" alt="image"> </div>';
      incoming_msg += '<div class="received_msg">';
      incoming_msg += '<div class="received_withd_msg">';
      incoming_msg += '<p>'+data.message+'</p>';
      incoming_msg += '<span class="time_date">'+data.fromUserName +'    |   '  + strdatetime +'</span>';
      incoming_msg += '</div></div>';
      incoming_msg += '</div>';
      $("#msg_history").append(incoming_msg);
    }
    
  }

  
  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    // addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }


  // Keyboard events

  $window.keydown(function (event) {
    
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });


  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    if (userLoggedIn === undefined || !userLoggedIn || userLoggedIn == null){ 
      let dataInJson = data;
      console.log("===on login ====", data);
      localStorage.setItem('userLoggedIn', dataInJson.id);
      localStorage.setItem('numUsers', dataInJson.numUsers);
      localStorage.setItem('user', dataInJson.user);
      localStorage.setItem('socketId', dataInJson.socketId);
      localStorage.setItem('allUsers', JSON.stringify(dataInJson.allUsers));
    }
    userLoggedIn = localStorage.getItem('userLoggedIn');
    
    console.log("===userLoggedIn======", userLoggedIn);
    $('#userlog').val(localStorage.getItem('user'));
   
    connected = true;
    usersList = data.allUsers
    // Display the welcome message
    var message = "Lets Chit Chat";
    drawUsersList();
    setAddUsersList();
    addParticipantsMessage(data);
  });

  // When user update his username
  $("#userlog").keydown(function (event) {
    // event.preventDefault();
    let updatedusername = $("#userlog").val();
    // userLoggedIn.user = updatedusername;
    localStorage.setItem('user', updatedusername);

    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      socket.emit('username updated', {
        userId: userLoggedIn,
        username: updatedusername
      });

      // $("#userlog").prop("disabled", true);
      $("#userlog").addClass("border-0")
      $("#userlog").removeClass("border");
    }
  });

  $("#editUser").click(()=> {
    // $("#userlog").prop("disabled", false);
    $("#userlog").removeClass("border-0")
    $("#userlog").addClass("border");
  })

  socket.on('username updated', function (data) {
    usersList = data.allUsers;
    drawUsersList();
  });


  socket.on('new message', function (data) {
    console.log("===data===", data);
   
  });

  socket.on('private message', function (data) {
    userChats.push(data);
    localStorage.setItem('chat', JSON.stringify(userChats));

    // unread count
    setBadge()
    // =============

    if(data.fromUserId === toUser) {
      addChatMessage(data, 'receiver');
    }
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    usersList = data.allUsers
    console.log("===data.allUsers=== ", data.allUsers);
    localStorage.setItem('allUsers', JSON.stringify(data.allUsers));


    drawUsersList(); //+ ' joined'
    setAddUsersList();
    
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    usersList = data.allUsers;
    console.log("===data.allUsers=== ", data.allUsers);

    // localStorage.setItem('allUsers', JSON.stringify(data.allUsers));

    drawUsersList();
    // addParticipantsMessage(data);
    // removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });



function setBadge(data = {}) {
  let userChats = JSON.parse(localStorage.getItem('chat'));
  console.log("===userChats=== ", userChats);

  if(userChats!== null && userChats.length > 0) {
    let fromUserId = userChats[0].fromUserId;
      let fromUserCount = 0;
      userChats.forEach((chat)=> {
        if(chat.fromUserId === data.fromUserId && chat.toUserid === data.toUserid 
          && chat.message === data.message) {
            chat.read = true;
          }

        if(userLoggedIn !== undefined && chat.toUserid === userLoggedIn.id) {
          if(chat.fromUserId !== fromUserId && !chat.read) {
            $("#badge"+fromUserId).removeClass("d-none");
            $("#badge"+fromUserId).text(fromUserCount);
            console.log("====fromUserCount=====", fromUserCount);
            fromUserId = chat.fromUserId;
            fromUserCount = 0;
          } else {
            if(!chat.read) {
              fromUserCount ++;
            }
          }
          if(fromUserCount == 0) { 
            $("#badge"+fromUserId).addClass("d-none");
          } else {
            $("#badge"+fromUserId).removeClass("d-none");
          }

          $("#badge"+fromUserId).text(fromUserCount);
          console.log("====fromUserCount=====", fromUserCount);
        }
      });
  }
}

function chatElementClick() {
  // $('.chat_people, .chat_ib, .').click((e)=>{
  //   $(".chat_list").click();
  // })
  $(".chat_list.chat_ele").click((event)=> {
    // let div = $(this).next(".chat_list");
    console.log("event:: ", event.currentTarget.attributes);
    isGroup = event.currentTarget.attributes['data-isgroup'].value;

    let id = event.currentTarget.id;
    $(".chat_list").removeClass('active_chat');
    $("#"+id).addClass('active_chat');

    $(".mesgs").removeClass("d-none");
    $(".welcome-screen").addClass("d-none");
    console.log("isGroup:: "+isGroup);
    if(isGroup === 'true') {
    let groupObject = JSON.parse($("#"+id).find(".group-object").val());
      console.log("=====groupObject======", groupObject);
      toGroup =  event.currentTarget.id;
      toUser = '';
      setMessageHistory(toGroup, isGroup);
    } else {
      toUser = event.currentTarget.id;
      toGroup = '';
      console.log('====userChats====', userChats);
      setMessageHistory(toUser, isGroup);
    }
  });
}


});