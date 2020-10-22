// Setup basic express server
var express = require('express');
const dotenv = require('dotenv');
dotenv.config();
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var connectToDatabase = require('./db.js');
const userModel = require('./models/user.js');
const { aggregateWithGroupBy, findOne, updateAll, create, upsert} = require('./services/database.js');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
  connectToDatabase();
});

app.use(express.static(__dirname));
var numUsers = 0;
var allUsers = [];
var rooms = [];

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

  socket.on('add user',  async(data) => {
    console.log('===add user =====');
    let username = data.username;
    
    let socketId = socket.id;
    console.log('===socket id====', socketId);

    let userId;
    if (data.userLoggedIn !== undefined && data.userLoggedIn !== '') {
      userId = data.userLoggedIn;
    } else {
      userId = socket.id;
    }

    let roomFound = rooms.filter((r) => {
      return (r === ('usr_' + userId));
    });
    console.log('===roomfound=====', roomFound);

    if (roomFound.length === 0) {
      rooms.push('usr_' + userId);
    }

    // let userId =  (data.userLoggedIn !== undefined && data.userLoggedIn !== '')? data.userLoggedIn: socket.id;
    

    socket.username = username;
    ++numUsers;
    
    let filterParams = {userId: userId};
    let userdetails = await findOne(filterParams, userModel);
    let socketIdArr =  (userdetails !== null) ? userdetails.socketId: [];
    socketIdArr.push(socketId);

    let newUser = {
      user: username,
      id: userId,
      socketId: socketIdArr
    };

    await upsert(filterParams, newUser, userModel);
   
    for(let room of rooms) {
      socket.join('usr_'+room);
      
      //  if (room !== userId) {
        // console.log('===room===', room);
        // console.log('===userId=====', userId);
        io.to('usr_'+room).emit('user joined', {
          username: socket.username,
          id: userId,
          socketId: socketId
        });  
      // }
    }
    setInterval(() => {
      console.log('=== in timeout === ===rooms=====', rooms);

      for(let room of rooms) {
        socket.join('usr_'+room);
        io.to('usr_'+room).emit('testpayload',  socket.username + ' saying hii!!');  
      }
    }, 10000, 3);

    socket.emit('login', {
      numUsers: numUsers,
      user: username,
      id: userId,
      socketId: socketId, // socket.id,
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
  
});


