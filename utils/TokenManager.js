const jwt = require('jsonwebtoken');


class TokenManager {
  constructor() {
    this.secretKey = "Selim12345";
    this.expiresIn = '1h'
  }

  generateToken(userId) {
    return jwt.sign({ userId },
                     this.secretKey,
                    {'expiresIn': this.expiresIn });
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.secretKey);
      return decoded.userId;
    } catch (error) {
      return null;
    }
  }
}

module.exports = TokenManager;
