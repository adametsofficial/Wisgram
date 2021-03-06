const jwt = require('jsonwebtoken');
const config = require('config');
const { query } = require('../../utils/database');

const { jwtExpirySeconds } = require('../../utils/config');

function generateAccessToken(data) {
  return jwt.sign(data, config.get('JWTSecret'), {
    expiresIn: jwtExpirySeconds,
  });
}

module.exports = (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken == null) return res.sendStatus(401);
  return jwt.verify(
    refreshToken,
    config.get('JWTSecret'),
    async (err, { email, userId }) => {
      if (err) return res.sendStatus(403);

      const accessToken = generateAccessToken({ email, userId });
      res.cookie('accessToken', accessToken);

      const user = await query('SELECT * FROM users WHERE userId=?', [userId]);
      delete user[0].password;

      return res.json({ user: user[0] });
    },
  );
};
