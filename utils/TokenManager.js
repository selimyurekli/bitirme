const jwt = require('jsonwebtoken');


class TokenManager {
  constructor() {
    this.secretKey = "Selim12345";
    this.expiresIn = '1y'
  }

  generateToken(userId) {
    return jwt.sign({ userId },
                     this.secretKey,
                    {'expiresIn': this.expiresIn });
  }

  verifyToken(token) {
    var token = token.split("Bearer ")[1];
    
    try {
      if (typeof token !== 'undefined' && token !== null) {
        const decoded = jwt.verify(token, this.secretKey);
        return decoded.userId;
      } else {
          return null;
      }
      
    } catch (error) {
      console.log(error)
      return null;
    }
  }
}

module.exports = TokenManager;
