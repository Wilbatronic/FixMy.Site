const emailTemplate = (title, name, message) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; }
      .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; }
      .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
      .content { font-size: 16px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">${title}</div>
      <div class="content">
        <p>Hello ${name},</p>
        <p>${message}</p>
        <p>Thank you for using FixMy.Site!</p>
      </div>
    </div>
  </body>
  </html>
`;

module.exports = emailTemplate;
