/*==============================================================*/
// Raque Contact Form  JS
/*==============================================================*/
(function ($) {
    "use strict"; // Start of use strict
    $("#contactForm").validator().on("submit", function (event) {
        if (event.isDefaultPrevented()) {
            // handle the invalid form...
            formError();
            submitMSG(false, "Did you fill in the form properly?");
        } else {
            // everything looks good!
            event.preventDefault();
            submitForm();
        }
    });


    function submitForm() {
        // Initiate Variables With Form Content
        var name = $("#name").val();
        var email = $("#email").val();
        var msg_subject = $("#msg_subject").val();
        var phone_number = $("#phone_number").val();
        var message = $("#message").val();


        sendEmail(name, email, phone_number, msg_subject, message);

        // $.ajax({
        //     type: "POST",
        //     url: "assets/php/form-process.php",
        //     data: "name=" + name + "&email=" + email + "&msg_subject=" + msg_subject + "&phone_number=" + phone_number + "&message=" + message,
        //     success: function (text) {
        //         if (text == "success") {
        //             formSuccess();
        //         } else {
        //             formError();
        //             submitMSG(false, text);
        //         }
        //     }
        // });
    }

    function formSuccess() {
        $("#contactForm")[0].reset();
        submitMSG(true, "Message Submitted!")
    }

    function formError() {
        $("#contactForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
            $(this).removeClass();
        });
    }

    function submitMSG(valid, msg) {
        if (valid) {
            var msgClasses = "h4 tada animated text-success";
        } else {
            var msgClasses = "h4 text-danger";
        }
        $("#msgSubmit").removeClass().addClass(msgClasses).text(msg);
    }

    // ref: https://www.youtube.com/watch?v=sGQSz22U8VM
    function sendEmail(_name, _email, _phone, _msg_subject, _message) {
        Email.send({
            SecureToken: "2009fb93-ccd5-4e36-85ec-7f41ca0abce9",
            To: 'pasi1028@gmail.com',
            From: "pasindu@srqrobotics.com",
            Subject: "Get In Touch",
            Body: "        <b>Name:</b> " + _name
                + "<br>   <b>Email:</b> " + _email
                + "<br>   <b>Phone:</b> " + _phone
                + "<br> <b>Subject:</b> " + _msg_subject
                + "<br> <b>Message:</b> <br>" + _message

        }).then(
            message => alert(message)
        );
    }
}(jQuery)); // End of use strict