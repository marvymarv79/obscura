import { neon } from '@neondatabase/serverless'

const MESSIER_MAP = {
  1:'NGC1952',2:'NGC7089',3:'NGC5272',4:'NGC6121',5:'NGC5904',
  6:'NGC6405',7:'NGC6475',8:'NGC6523',9:'NGC6333',10:'NGC6254',
  11:'NGC6705',12:'NGC6218',13:'NGC6205',14:'NGC6402',15:'NGC7078',
  16:'NGC6611',17:'NGC6618',18:'NGC6613',19:'NGC6273',20:'NGC6514',
  21:'NGC6531',22:'NGC6656',23:'NGC6494',24:'IC4715',25:'IC4725',
  26:'NGC6694',27:'NGC6853',28:'NGC6626',29:'NGC6913',30:'NGC7099',
  31:'NGC224',32:'NGC221',33:'NGC598',34:'NGC1039',35:'NGC2168',
  36:'NGC1960',37:'NGC2099',38:'NGC1912',39:'NGC7092',
  41:'NGC2287',42:'NGC1976',43:'NGC1982',44:'NGC2632',
  46:'NGC2437',47:'NGC2422',48:'NGC2548',49:'NGC4472',50:'NGC2323',
  51:'NGC5194',52:'NGC7654',53:'NGC5024',54:'NGC6715',55:'NGC6809',
  56:'NGC6779',57:'NGC6720',58:'NGC4579',59:'NGC4621',60:'NGC4649',
  61:'NGC4303',62:'NGC6266',63:'NGC5055',64:'NGC4826',65:'NGC3623',
  66:'NGC3627',67:'NGC2682',68:'NGC4590',69:'NGC6637',70:'NGC6681',
  71:'NGC6838',72:'NGC6981',73:'NGC6994',74:'NGC628',75:'NGC6864',
  76:'NGC650',77:'NGC1068',78:'NGC2068',79:'NGC1904',80:'NGC6093',
  81:'NGC3031',82:'NGC3034',83:'NGC5236',84:'NGC4374',85:'NGC4382',
  86:'NGC4406',87:'NGC4486',88:'NGC4501',89:'NGC4552',90:'NGC4569',
  91:'NGC4548',92:'NGC6341',93:'NGC2447',94:'NGC4736',95:'NGC3351',
  96:'NGC3368',97:'NGC3587',98:'NGC4192',99:'NGC4254',100:'NGC4321',
  101:'NGC5457',102:'NGC5866',103:'NGC581',104:'NGC4594',105:'NGC3379',
  106:'NGC4258',107:'NGC6171',108:'NGC3556',109:'NGC3992',110:'NGC205'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const setupKey = req.headers['x-setup-key']
  if (!setupKey || setupKey !== process.env.DB_SETUP_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    await sql`ALTER TABLE targets ADD COLUMN IF NOT EXISTS messier_number INTEGER`

    let updated = 0
    for (const [mNum, ngcId] of Object.entries(MESSIER_MAP)) {
      const result = await sql`
        UPDATE targets SET messier_number = ${parseInt(mNum)}
        WHERE ngc_ic_id = ${ngcId} AND (messier_number IS NULL OR messier_number != ${parseInt(mNum)})
      `
      if (result.length > 0) updated++
    }

    return res.status(200).json({
      success: true,
      message: `Messier migration complete: column added, ${updated} targets updated`,
      totalMappings: Object.keys(MESSIER_MAP).length
    })
  } catch (error) {
    console.error('Messier migration error:', error)
    return res.status(500).json({ error: error.message })
  }
}
