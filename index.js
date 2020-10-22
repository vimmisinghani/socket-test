// Setup basic express server
var express = require('express');
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname));
var groupCollection =  new function() {
  this.totalGroupCount = 0,
  this.groupList = []
};

var numUsers = 0;
var allUsers = [];

io.on('connection', function (socket) {

  var addedUser = false;
  socket.on('username updated', function (data) {
    if(allUsers.length > 0){
      allUsers.forEach((user)=> {
        if(user.id === data.userId) {
          user.user = data.username;
        }
      }); 
    }

    socket.broadcast.emit('username updated', {allUsers: allUsers});
  });


  socket.on('private message', function (data) {

    let toUserSocketId;
    let fromUserName;
    allUsers.forEach((user) => {
          
      if(user.id === data.toUserid) {
        toUserSocketId = user.socketId
      }
      if(user.id === data.fromUserId) {
        fromUserName = user.user;
      }
    });
    data['fromUserName'] = fromUserName;
    io.to(toUserSocketId).emit('private message', data);
  });

  
  socket.on('add user', function (data) {
    let username = data.username;
    
    let socketId = socket.id;//
    let userId =  (data.userLoggedIn !== undefined && data.userLoggedIn !== '')? data.userLoggedIn: socket.id;
    if (addedUser) return;

    socket.username = username;
    ++numUsers;
    
    addedUser = true;

    let newUser = {
      numUsers: numUsers,
      user: username,
      id: userId,
      socketId: socketId
    };

    if (data.userLoggedIn !== undefined && data.userLoggedIn !== '') {
      allUsers.filter((user) => {
        if(user.id === newUser.id) {
          user.socketId = socketId
        }
      });
    } 
   
      allUsers.push(newUser);
    
    socket.emit('login', {
      numUsers: numUsers,
      user: username,
      id: userId,
      socketId: socketId, // socket.id,
      allUsers: allUsers,
      stime: Date.now(),
      read: false
    });
   
    socket.broadcast.emit('user joined', {
      username: socket.username,
      id: userId,
      socketId: socketId,
      numUsers: numUsers,
      allUsers: allUsers
    });
  });

  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username,
      id: socket.id
    });
  });

  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username,
      id: socket.id
    });
  });

  
  socket.on('disconnect', function () {

    if (addedUser) {
      --numUsers;

      allUsers = allUsers.filter((user)=>{
        if(user.socketId !== socket.id) {
          return user
        }
      });
   
      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        id: socket.id,
        numUsers: numUsers,
        allUsers: allUsers
      });
    }
  });

  
  socket.on('create group', function (data) {


    let grpUsers = data.grpUsers.split(",")
    let groupId = (Math.random()+1).toString(36).slice(2, 18);
   groupCollection.groupList.push({
     groupId: groupId,
     grpUsers: grpUsers,
     grpName: data.grpName,
     admin: data.admin,
     adminName: data.adminName,
     chat: []
   });
   
    groupCollection.totalGroupCount ++;

    grpUsers.forEach((user) => {
      // find out socketId of user
      let userSocketId;
      allUsers.forEach((u) => {
        if(u.id === user) {
          userSocketId = u.socketId;
        }
      });
      // =========================


      if(userSocketId !== undefined) {
         io.to(userSocketId).emit('group created', {
           groupId: groupId,
           grpUsers: grpUsers,
           grpName: data.grpName,
           admin: data.admin,
           adminName: data.adminName,
           adminSocketId: data.adminSocketId, 
           chat: [],
           //  admin: socket.username,
         });
      }
    });
    

 });

 socket.on('group message send', function(data){
   let fromUserId = data.fromUserId;
   let message = data.message;
   
   let groupId = data.groupId;
   
   let groupDetails = groupCollection.groupList.filter((grp) => {
     if(grp.groupId === groupId)
      return grp;
   });
  
   if(groupDetails !== undefined && groupDetails.length > 0){
     let groupUsers = groupDetails[0].grpUsers;
     groupUsers.forEach((user) => {

       let toUserSocketId;
       let fromUserName;
       
       allUsers.forEach((u) => {
          
          if(u.id === user) {
            toUserSocketId = u.socketId
          }
          if(u.id === fromUserId) {
            fromUserName = u.user;
          }
       });

       let obj = {
        fromUserName: fromUserName,
        fromUserId: fromUserId,
        groupId: groupDetails[0].groupId,
        grpUsers: groupUsers,
        grpName: groupDetails[0].grpName,
        message: message
      };

      
       if(user !== "" && user !== fromUserId) {
        
          if(toUserSocketId !== undefined && toUserSocketId !== null) {
            io.to(toUserSocketId).emit('group message received', obj );
          }

       }
     });
   }
 });
});


