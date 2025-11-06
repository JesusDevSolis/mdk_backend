require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: '69093992fea8425500eb8da6' },
  process.env.JWT_SECRET,
  {
    expiresIn: '30d',
    issuer: 'taekwondo-system',
    audience: 'taekwondo-users'
  }
);

console.log('\n✅ Token generado correctamente:\n');
console.log(token);
console.log('\nCópialo y pégalo en Insomnia o Postman como:');
console.log('Authorization: Bearer <TU_TOKEN>');
