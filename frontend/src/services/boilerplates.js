// Boilerplate shown to the admin when they add a new "coding"/"scenario"
// question for a given domain — saves them typing the same setup every
// time. It's just a starting point; admin can edit freely before saving.

export const boilerplates = {
  react: `function Solution() {
  // TODO: implement
  return (
    <div>
      Hello
    </div>
  )
}

export default Solution`,

  java: `public class Solution {
    public static void main(String[] args) {
        // TODO: implement
    }
}`,

  python: `def solution():
    # TODO: implement
    pass

if __name__ == "__main__":
    solution()`,

  devops: `# TODO: implement
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]`,

  da: `-- TODO: implement
SELECT column_name
FROM table_name
WHERE condition;`,

  htmlcss: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Document</title>
  <style>
    /* TODO: implement */
  </style>
</head>
<body>

</body>
</html>`,

  htmlcssjs: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Document</title>
</head>
<body>

  <script>
    // TODO: implement
  </script>
</body>
</html>`,
}

export function getBoilerplate(domain) {
  return boilerplates[domain] || ''
}
