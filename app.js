import express from "express";
import mysql from "mysql";
import bcrypt from "bcrypt";
// import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import bodyParser from "body-parser";

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);


const app = express();
const PORT = 3001;
const saltRounds = 10;

var db = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'univ'
});

app.use(express.json());
app.use(express.static(__dirname + '/images'));
app.use(express.static(__dirname + '/node_modules/bootstrap'));

app.set('view engine', 'ejs');

// app.use(
//   cors({
//     origin: ["http://localhost:3000"],
//     methods: ["GET", "POST"],
//     credentials: true,
//   })
// );

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    key: "userId",
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 1000 * 60 * 60,
    },
  })
);

function createNewUser(ID,name,password,usertype){
  // const username = req.body.username;
  // const password = req.body.password;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
    }

    db.query(
      "INSERT INTO membersofcollege (ID,name,password,usertype) VALUES (?,?,?,?)",
      [ID, name, hash, usertype],
      (err, result) => {
        console.log(err);
      }
    );
  });
}


app.get("/", (req, res) => {
  let user = req.session.user;
  if (req.session.user) {
    if(user.usertype === "admin") res.render("AdminHome", {user:user});
    else if(user.usertype === "faculty") res.render("faculty_afterlogin", {user:user});
    else if(user.usertype === "student") res.render("afterlogin", {user:user});
    else res.render("index");
  }
  else res.render("index");
});

app.get("/login", (req,res) => {
	if (req.session.user) {
		res.redirect("/");
	}
	else {
		res.render("login");
	}
})

app.post("/login", (req, res) => {
  const ID = req.body.ID;
  const password = req.body.password;
  db.query(
    "SELECT * FROM membersofcollege WHERE ID = ?;",
    ID,
    (err, result) => {
      if (err) {
        console.log(err);
      }
      if (result != {}) {
        bcrypt.compare(password, result[0].password, (error, response) => {
          if (response) {
            req.session.user = result[0];
            res.redirect("/");
          } else {
            res.send("Wrong ID/password combination!");
          }
        });
      } else {
        res.send("User doesn't exist");
      }
    }
  );
});

app.get("/create_id", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype === "admin") res.render("create_id");
  else res.send("You are not authenticated to view this page");
})

app.post("/create_id", (req,res) => {
  let user = req.session.user;
  let ID = req.body.ID;
  let name = req.body.name;
  let password = req.body.password;
  let usertype = req.body.usertype;
  if(! user) res.redirect("/");
  else if(user.usertype === "admin"){
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        console.log(err);
      }
      db.query(
        "INSERT INTO membersofcollege values(?,?,?,?);",
        [ID, name, hash, usertype],
        (err, result) => {
          if(err) console.log(err);
        }
      );
    });
    res.redirect("/");
  }
  else res.send("Access Denied");
});

app.get("/delete_id", (req,res) => {
  let user = req.session.user;
  if((user) && (user.usertype === "admin")) res.render("delete_id");
  else res.send("You are not authenticated to view this page");
})

app.post("/delete_id", (req,res) => {
  let user = req.session.user;
  let delId = req.body.ID;
  if(! user) res.redirect("/");
  else if(user.usertype === "admin"){
    if(user.ID === delId) res.send("Cannot delete your own id");
    db.query(
      "DELETE FROM membersofcollege WHERE ID = ?;",
      delId,
      (err, result) => {
        if(err){
          console.log(err);
        }
      }
    );
    res.redirect("/");
  }
  else res.send("Access Denied");
});

app.get("/viewtables", (req,res) => {
  let user = req.session.user;
  if(! user) req.redirect("/");
  else if(user.usertype !== "admin") res.send("Access Denied");
  else res.render("Tables");
})

app.get("/assigngrade", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype === "faculty") res.render("Assign Grade");
  else res.send("Only faculty can assign grades");
})

app.post("/assigngrade", (req,res) => {
  let studentID = req.body.studentID;
  let grade = req.body.grade;
  let course = req.body.course;
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype === "faculty"){
    db.query(
      "SELECT * FROM faculty where ID = ?;",
      user.ID,
      (err, result) => {
        if(err) console.log(err);
        else{
          console.log(result);
          let deptartmentOfFaculty = result[0].Department;
          db.query(
            "SELECT * FROM course WHERE course_code = ?;",
            course,
            (err2,result2) => {
              if(err2){
                console.log(err2);
              }
              else{
                let departmentOfCourse = result2[0].Department;
                if(departmentOfCourse === deptartmentOfFaculty){
                  db.query("insert into grade values (?,?,?);",
                    [course, grade, studentID],
                    (err3) => {
                      if(err3){
                        console.log(err3);
                      }
                    }
                  );
                  console.log()
                  res.redirect("/");
                }
                else res.send("Cannot update marks of other department");
              }
            }
          )
        }
      }
    );
  }
  else res.send("Access Denied");
})

app.get("/make_admin", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype === "admin"){
    res.render("make_admin");
  }
  else res.send("Not authenticated");
})

app.post("/makeadmin", (req,res) => {
  let user = req.session.user;
  let id = req.body.id;
  if(! user) res.redirect("/");
  else if(user.usertype == "admin"){
    db.query(
      "UPDATE membersofcollege SET usertype = ? WHERE ID = ?;",
      ["admin",id],
      (err) => {
        if(err) console.log(err);
      }
    )
    res.redirect("/");
   }
  else res.send("Access Denied");
})


app.get("/viewgradesheet", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype !== "student") res.render("You are not a student");
  else{
    db.query(
    "SELECT grade.course_id,grade.grade,course.credits,course.Name FROM course INNER JOIN grade ON course.course_code = grade.course_id WHERE grade.student_id = ?;",
    user.ID,
    (err,result) => {
        if(err){
          console.log(err);
        }
        res.render("Grade_student", {result:result, user:user});
      }
    );
  }
})

app.get("/changepassword", (req,res) => {
  let user = req.session.user;
  if(user) res.render("Change_Password");
  else res.redirect("/");
})

app.post("/changepassword", (req,res) => {
  let currentPassword = req.body.currentPassword;
  let newPassword = req.body.newPassword;
  let confirmPassword = req.body.confirmPassword;
  let user = req.session.user;
  if(confirmPassword != newPassword) res.send("New password and Confirm password fields are not same");
  else{
    bcrypt.compare(currentPassword, user.password, (error, response) => {
      if (response) {
        bcrypt.hash(newPassword,saltRounds, (err,hash) => {
          if(err){
            console.log(err);
          }
          else{
            db.query(
              "UPDATE membersofcollege SET password = ? WHERE ID = ?;",
              [hash,user.ID],
              (err2) => {
                if(err2){
                  console.log(err2);
                }
                else res.redirect("/");
              }
            );
          }
        })
      } else {
        res.send("Enter correct current password");
      }
    });
  }
})

// app.get("/Update_table", (req,res) => {
//   let user = req.session.user;
//   if(! user) res.redirect("/");
//   if(user.usertype == "admin"){
//   }
//   else res.send("Access Denied");
// })

app.post("/logout", (req,res) => {
  delete req.session.user;
  res.redirect("/");
})

app.get("/updatepersonaldetails", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype !== "student") res.send("Not logged in as student");
  else res.render("update");
})

app.post("/updatepersonaldetails", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype !== "student") res.send("Not logged in as student");
  else{
    let department = req.body.department;
    let facultyadvisor = req.body.facultyadvisor;
    let caterer = req.body.caterer;
    let address = req.body.address;
    let pincode = req.body.pincode;
    let place = req.body.place;
    let phone = req.body.phone;
    let email = req.body.email;
    let year = 2022;
    db.query(
      "INSERT into student values (?,?,?,?,?,?,?,?,NULL,NULL,NULL);",
      [user.ID,user.Name,address,department,year,phone,facultyadvisor,caterer],
      (err) => {
        if(err) console.log(err);
      }
    );
    res.redirect("/");
  }
})

app.get("/updatefacultydetails", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype !== "faculty") res.send("Not logged in as faculty");
  else res.render("faculty_info");
})

app.post("/updatefacultydetails", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype !== "faculty") res.send("Not logged in as faculty");
  else{
    let Department = req.body.Department;
    let Specialization = req.body.Specialization;
    let Courses = req.body.Courses;
    let Salary = req.body.Salary;
    let Role = req.body.Role;
    db.query(
      "INSERT into faculty values (?,?,?,?,?,?,?);",
      [user.ID,user.Name,Specialization,Department,Role,Courses,Salary],
      (err) => {
        if(err) console.log(err);
      }
    );
    res.redirect("/");
  }
})

app.get("/membersofcollege", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype !== "admin") res.send("Access Denied");
  else{
    let quer = "SELECT * FROM membersofcollege;";
    db.query(
      quer,
      (err,result) => {
      if(err) console.log(err);
      res.render("membersofcollege", {result:result});
    });
  }
})

app.get("/student", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype !== "admin") res.send("Access Denied");
  else{
    let quer = "SELECT * FROM student;";
    db.query(
      quer,
      (err,result) => {
      if(err) console.log(err);
      res.render("student", {result:result});
    });
  }
})

app.get("/course", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype !== "admin") res.send("Access Denied");
  else{
    let quer = "SELECT * FROM course;";
    db.query(
      quer,
      (err,result) => {
      if(err) console.log(err);
      res.render("course", {result:result});
    });
  }
})

app.get("/Department", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype !== "admin") res.send("Access Denied");
  else{
    let quer = "SELECT * FROM Department;";
    db.query(
      quer,
      (err,result) => {
      if(err) console.log(err);
      res.render("Department", {result:result});
    });
  }
})

app.get("/faculty", (req,res) => {
  let user = req.session.user;
  if(! user) res.redirect("/");
  else if(user.usertype !== "admin") res.send("Access Denied");
  else{
    let quer = "SELECT * FROM faculty;";
    db.query(
      quer,
      (err,result) => {
      if(err) console.log(err);
      res.render("faculty", {result:result});
    });
  }
})

app.listen(PORT, () => {
  console.log("running server");
});