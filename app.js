//jshint esversion:8

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

mongoose.connect('mongodb://localhost:27017/dattDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//create post schema

const postSchema = mongoose.Schema({
  title: String,
  content: String,
  date: Date,
  imageLocation: String,
  rating: {
    overall: Number,
    taste: Number,
    texture: Number,
    bun: Number,
    toppings: Number,
    service: Number
  },
  course: mongoose.Types.ObjectId
});

const Post = mongoose.model("post", postSchema);


const courseSchema = mongoose.Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    ref: 'Post'
  },
  name: String,
  location: String,
  url: String
});

const Course = mongoose.model("course", courseSchema);

///////RENDER PAGES////////

//get home page
app.get("/", function(req, res) {
  res.render("home", {
    title: "Dog At The Turn"
  });
});

//get about page
app.get("/about", function(req, res) {
  res.render("about", {
    title: "About | Dog At The Turn"
  });
});

//get courses page
app.get("/courses", function(req, res) {
  Course.find({}, function(err, foundCourses) {
    if (err) {
      console.log("Rendering courses resulted in the following error: " + err);
    } else {
      res.render("courses", {
        title: "Courses | Dog At The Turn",
        courses: foundCourses
      });
    }
  });
});

//get reviews page
app.get("/reviews", function(req, res) {

  Post.find({}, function(err, foundReviews) {
      if (err) {
        console.log("Rendering reviews resulted in the following error: " + err);
      } else {
        res.render("reviews", {
          title: "Reviews | Dog At The Turn",
          reviews: foundReviews
        });
      }
    })
    .sort({
      date: -1
    });
});

//get a specific review
app.get("/reviews/:postId", function(req, res) {
  const requestedPostId = req.params.postId;

  Post.findOne({
    _id: requestedPostId
  }, function(err, foundPost) {
    if (!err) {
      if (foundPost) {

        Course.findOne({
          _id: foundPost.course
        }, function(err, foundCourse) {

          res.render("review", {
            title: foundPost.title,
            review: foundPost,
            course: foundCourse,
          });
        });

      } else {
        res.render("404", {
          title: "Error | Dog At The Turn"
        });
      }
    } else {
      res.send(err);
    }
  });
});

// Search reviews by search string. If none are found, redirect to the reviews page
app.post("/search", function(req, res) {
try {
  const searchText = req.body.searchText;
  Post.findOne({
    title: new RegExp(searchText, "i")
  }, function(err, foundPost) {
    if (!err) {
      if (foundPost) {
        res.redirect("/reviews/" + foundPost._id);
      } else {
        res.render("noSearchResults", {
          title: "Dog At The Turn",
          searchText: searchText
        });
      }
    } else {
      console.log("Searching caused the following error: " + err);
      res.redirect("/");
    }
  });
  //error typically happens if the user searches with an invalid regular expression (eg **/)
}catch(e) {
  res.redirect("/404");
}




});

//render the compose page where reviews are written
app.get("/compose", function(req, res) {
//only render page if running app as admin
  if(!process.env.ADMIN_PASSWORD) {
    res.redirect("/");
  }
else {
  res.render("compose", {
    title: "Compose | Dog At The Turn"
  });
}
});

//create a new review and course and save it to the database
app.post("/compose", function(req, res) {

    const newPost = new Post({
      title: req.body.title,
      content: req.body.content,
      date: req.body.date,
      imageLocation: req.body.imageURL,
      rating: {
        overall: req.body.rating
      },
      course: new mongoose.Types.ObjectId()
    });

    const newCourse = new Course({
      _id: newPost.course,
      name: req.body.courseName,
      location: req.body.location,
      url: req.body.URL
    });

    newPost.save(function(err) {
      if (err) {
        console.log("Saving the new post resulted in the following error: " + err);
      }
    });

    newCourse.save(function(err) {
      if (err) {
        console.log("Save the new course resulted in the following error: " + err);
      }
    });

    res.redirect("/");


});

//handle invalid routes
app.use(function(req, res, next) {

  //count all posts and generate random number
  Post.countDocuments({}, function(err, count) {
    if(!err) {
      const random = Math.floor(Math.random() * count);

      //skip posts by random number
      Post.findOne().skip(random).exec(function(err, foundPost) {
        if(!err) {
          res.status(404).render("404", {
            post: foundPost,
            title: "Error | Dog At The Turn"
          });
        }
        else {
          console.log("Rendering 404 pager resulted in the following error: " + err);
        }

      });
    }
    else {
      console.log("Counting documents resulted in the following error: " + err);
    }

  });
});


//listen on localhost port 3000
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
