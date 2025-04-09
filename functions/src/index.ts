import * as dotenv from "dotenv";
dotenv.config();

import * as functions from "firebase-functions";
import axios from "axios";

export const fetchRecipeFromOpenAI = functions.https.onRequest(
  async (req, res) => {
    const ingredients: string[] = req.body.ingredients;
    const equipment: string[] = req.body.equipment;
    const avoid: string[] = req.body.avoid;
    const maxCookingTime: number = req.body.maxCookingTime;
    const mealType: string = req.body.mealType;
    const diet: string = req.body.diet;
    const language: string = req.body.language;

    const prompt = `
다음 조건에 맞춰 만들 수 있는 요리 3가지를 추천해줘. 각각은 JSON 형식으로 제공되어야 하며, 아래 구조를 따라야 해:
{
  "title": "요리 이름",
  "description": "이 요리가 어떤 음식인지 짧고 맛깔나게 설명",
  "ingredientsUsed": ["재료1", "재료2"],
  "missingIngredients": ["재료 중 집에 없는 것들"],
  "cookingTime": 25,
  "difficulty": "쉬움 | 보통 | 어려움",
  "steps": ["1단계 설명", "2단계 설명"],
  "tips": "조리 팁",
  "imageURL": "https://..."
}
전체 응답은 다음처럼 감싸야 해:
{
  "recipes": [ ... ]
}
조건:
- 사용 가능한 재료: ${ingredients.join(", ")}
- 사용 가능한 조리 도구: ${equipment.join(", ")}
- 피해야 할 재료: ${avoid.join(", ")}
- 최대 조리 시간: ${maxCookingTime}분
- 식사 유형: ${mealType}
- 식단: ${diet}
- 응답 언어: ${language === "en" ? "English" : "Korean"}
반드시 유효한 JSON 형식으로 응답해줘.
`;

    const payload = {
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "당신은 요리사입니다."},
        {role: "user", content: prompt},
      ],
      temperature: 0.7,
    };

    console.log(JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = response.data.choices[0].message.content;

      try {
        const parsed = JSON.parse(content);
        res.status(200).send(parsed);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        res.status(500).send({
          error: "OpenAI 응답을 JSON으로 파싱하지 못했습니다",
          raw: content,
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).send({error: error.message});
      } else {
        res.status(500).send({error: "알 수 없는 오류가 발생했습니다."});
      }
    }
  }
);
