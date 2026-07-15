/**
 * contract-defaults.ts — Fonte ÚNICA dos textos legais padrão do contrato.
 *
 * Por que este módulo existe:
 *   Estes textos ficavam hardcoded em server/pdf.ts como fallback. Quando
 *   company_object_<lang> / company_terms_<lang> estavam vazios no banco, o PDF
 *   saía completo com estas cláusulas, mas a tela de Configurações mostrava os
 *   campos EM BRANCO — ou seja, o Matheus não via nem controlava o texto legal
 *   que estava de fato saindo no documento.
 *
 * Regra da casa: o que já vem no PDF por padrão TEM que estar visível e
 *   editável nas Configurações. PDF e Settings leem a MESMA fonte de verdade.
 *
 * Consumidores:
 *   - server/pdf.ts        → fallback ao gerar o contrato;
 *   - settings.getContractDefaults (routers.ts) → pré-preenche a tela de
 *     Configurações quando o campo está vazio. Ao salvar, o texto passa a
 *     viver no banco e vira a fonte única (o default deixa de ser usado).
 */

export type ContractLanguage = 'pt' | 'en' | 'es';

export const DEFAULT_OBJETO: Record<ContractLanguage, string> = {
  pt: `O presente contrato tem como objeto a locação de bicicleta(s) e eventuais acessórios (doravante denominados em conjunto como "equipamento") de propriedade exclusiva da LOCADORA, cuja especificações encontram-se no campo próprio.

O LOCATÁRIO(A) afirma que recebeu a(s) bicicleta(s) em perfeitas condições de uso, funcionamento, conservadas, limpas e com todos os itens de segurança.

O LOCATÁRIO(A) declara estar em bom estado de saúde, possuindo aptidão física e técnica para a prática de ciclismo, inexistindo qualquer restrição médica que o(a) impeça de exercer tal atividade. Declara, ainda, ser plenamente capaz de exercer os atos da vida civil, isentando a LOCADORA de qualquer responsabilidade por danos à sua integridade física ou a terceiros.

O LOCATÁRIO(A) reconhece que ela é a única pessoa autorizada a conduzir a bicicleta e reconhece também os riscos inerentes à atividade de pedalar e compromete-se a utilizar equipamentos de proteção individual (capacete, joelheiras, luvas, sinalizadores, entre outros), assumindo inteira responsabilidade por eventuais acidentes que possam ocorrer consigo ou com terceiros.

O LOCATÁRIO(A) declara conhecimento e compromete-se a respeitar integralmente as normas de trânsito previstas no Código de Trânsito Brasileiro (CTB), bem como a fazer uso adequado da(s) bicicleta(s).

O LOCATÁRIO(A) assume a integral responsabilidade pela guarda e conservação da(s) bicicleta(s) e acessórios durante o período de locação, comprometendo-se a utilizar trava de segurança e outros sistemas de proteção disponíveis. O uso da trava de segurança e outros sistemas não isenta o LOCATÁRIO(A) de responsabilidade em caso de furto, roubo ou dano. A devolução deverá ocorrer no mesmo endereço da retirada, sendo a(s) bicicleta(s) submetida(s) a vistoria para verificação de seu estado de conservação.`,
  en: `This contract concerns the rental of bicycle(s) and any accessories (hereinafter collectively referred to as "equipment") that are the exclusive property of the LESSOR, whose specifications are found in the appropriate field.

The LESSEE affirms that they received the bicycle(s) in perfect working order, well-maintained, clean, and with all safety items.

The LESSEE declares that they are in good health, possessing the physical and technical aptitude for cycling, and that there are no medical restrictions that prevent them from engaging in this activity. They further declare that they are fully capable of exercising the acts of civil life, exempting the LESSOR from any liability for damages to their physical integrity or to third parties.

The RENTER acknowledges that they are the only person authorized to ride the bicycle and also acknowledges the risks inherent in cycling and agrees to use personal protective equipment (helmet, knee pads, gloves, lights, etc.), assuming full responsibility for any accidents that may occur to them or to third parties.

The RENTER declares knowledge of and agrees to fully respect the traffic regulations set forth in the Brazilian Traffic Code (CTB), as well as to make proper use of the bicycle(s).

The RENTER assumes full responsibility for the safekeeping and maintenance of the bicycle(s) and accessories during the rental period, agreeing to use a security lock and other available protection systems. The use of the security lock and other systems does not exempt the RENTER from liability in case of theft, robbery or damage. The bicycle(s) must be returned to the same address where they were picked up, and will be inspected to verify their condition.`,
  es: `Este contrato se refiere al alquiler de bicicletas y sus accesorios (en adelante, el "equipo"), propiedad exclusiva del ARRENDADOR, cuyas especificaciones se encuentran en el campo correspondiente.

El ARRENDATARIO declara haber recibido la(s) bicicleta(s) en perfecto estado de funcionamiento, bien mantenida(s), limpia(s) y con todos los elementos de seguridad necesarios.

El ARRENDATARIO declara gozar de buena salud, poseer aptitud física y técnica para el ciclismo y no tener ninguna restricción médica que le impida practicar esta actividad. Asimismo, declara estar plenamente capacitado para el ejercicio de la vida civil, eximiendo al ARRENDADOR de cualquier responsabilidad por daños a su integridad física o a terceros.

El ARRENDATARIO reconoce ser la única persona autorizada para circular en bicicleta y reconoce los riesgos inherentes al ciclismo, aceptándose el uso de equipo de protección individual (casco, rodilleras, guantes, luces, etc.), asumiendo la plena responsabilidad por cualquier accidente que pueda ocurrirle a él o a terceros. El ARRENDATARIO declara conocer y se compromete a respeitar plenamente las normas de tránsito establecidas en el Código de Tránsito Brasileño (CTB), así como a hacer un uso adecuado de la(s) bicicleta(s). El ARRENDATARIO asume la plena responsabilidad de la custodia y el mantenimiento de la(s) bicicleta(s) y sus accesorios durante el período de alquiler, comprometiéndose a utilizar un candado de seguridad y otros sistemas de protección disponibles. El uso del candado de seguridad y otros sistemas no exime al ARRENDATARIO de responsabilidad en caso de robo, hurto o daños. La(s) bicicleta(s) deberá(n) devolverse en la misma dirección donde se recogió y se inspeccionará para verificar su estado.`,
};

export const DEFAULT_TERMOS: Record<ContractLanguage, string> = {
  pt: `1. Todas as bicicletas são de propriedade exclusiva da LOCADORA e não possuem qualquer tipo de seguro. Em caso de sinistro, furto, roubo, perda, dano parcial ou total, ou qualquer outro evento que cause prejuízo à(s) bicicleta(s) ou seus acessórios, o LOCATÁRIO(A) será o único e integralmente responsável, comprometendo-se a ressarcir todos os custos de conserto, reposição ou aquisição de novo equipamento, cobrados conforme o preço de mercado.

2. O período mínimo de locação é de 1 (um) dia.

3. Para garantia da locação, a LOCADORA poderá exigir, a seu critério, uma caução em dinheiro ou bloqueio de valor em cartão de crédito, no valor de R$500,00 (quinhentos reais), que poderá ser utilizada para cobrir avarias, multa por descumprimento contratual, taxa de limpeza, entre outros. O valor será restituído ao LOCATÁRIO(A) em até 3 (três) dias úteis, ou conforme os prazos da administradora do cartão de crédito, após a devolução da(s) bicicleta(s) e constatada sua integridade. Havendo débitos, depois de abatidos os valores, eventual saldo será devolvido.

4. O LOCATÁRIO(A) autoriza a LOCADORA a realizar cópia de 01 (um) documento de identificação, durante a vigência do contrato.

5. Fica proibido a sublocação da(s) bicicleta(s) a terceiros, sendo seu uso estritamente pessoal. O uso por terceiros deverá ser previamente autorizado e identificado, com responsabilidade solidária, conforme termo aditivo a ser anexado neste contrato.

6. O LOCATÁRIO(A) compromete-se a utilizar a(s) bicicleta(s) de maneira prudente, evitando quedas, impactos e mau uso que comprometam o funcionamento do equipamento, bem como conduzi-la de modo a garantir a segurança de terceiros.

7. O LOCATÁRIO(A) deverá informar imediatamente qualquer dano, defeito ou irregularidade constatada, permitindo que a LOCADORA realize o reparo ou substituição, sem prejuízo do tempo de uso contratado. A não comunicação não constitui nenhum óbice à apuração dos fatos, de ofício, pela LOCADORA ou à emissão de cobranças adicionais destinadas a restituir eventuais prejuízos decorrentes deste contrato.

8. O LOCATÁRIO(A) não deve efetuar qualquer reparo ou autorizar qualquer serviço na bicicleta ou acessório sem a expressa e prévia anuência da LOCADORA.

9. Em caso de destruição, perda, roubo ou qualquer forma de inutilização da(s) bicicleta(s) ou de seus acessórios, o LOCATÁRIO(A) arcará integralmente com os custos de conserto ou de aquisição de um novo equipamento. A LOCADORA se compromete a apresentar ao LOCATÁRIO(A) orçamentos detalhados ou comprovantes de despesas que justifiquem os valores cobrados, buscando sempre o preço de mercado para itens ou serviços equivalentes.

10. O LOCATÁRIO(A) autoriza o uso de rastreador GPS na bicicleta e consente com eventual rastreamento para proteção do bem locado, bem como a utilização dos dados pela LOCADORA em caso de sinistro, furto, roubo, perda, dano, abandono da bicicleta ou para verificação do cumprimento das obrigações contratuais.

11. O LOCATÁRIO(A) autoriza, de forma gratuita, o uso de sua imagem e voz em fotos, vídeos e materiais institucionais da LOCADORA, com finalidade promocional, podendo solicitar a revogação por escrito. A LOCADORA se compromete a cessar o uso da imagem e voz do LOCATÁRIO(A) em novos materiais promocionais em até 30 dias após o recebimento da solicitação. Materiais já produzidos e em circulação antes da data da revogação não estão sujeitos a esta obrigação de forma retroativa.

12. Em caso de descumprimento de quaisquer obrigações contratuais pelo LOCATÁRIO(A) que não se refiram ao atraso na devolução da bicicleta (já coberto pela cobrança da diária), será aplicada uma multa de 10% (dez por cento) sobre o valor da diária de locação, limitada ao valor equivalente a 5 (cinco) diárias de locação. Esta multa é de natureza compensatória e não impede a LOCADORA de buscar indenização por perdas e danos que comprovadamente excedam o valor da multa, nem a rescisão imediata do contrato.

13. O inadimplemento de valores sujeitará o LOCATÁRIO(A) ao pagamento de multa de 2% (dois por cento) sobre o valor total devido, juros de 1% (um por cento) ao mês, e correção monetária pelo IGP-M/FGV (ou índice que o substitua), além das despesas com cobrança e honorários advocatícios em caso de cobrança judicial ou extrajudicial.

14. As partes se obrigam ao fiel cumprimento deste contrato, por si, seus herdeiros e sucessores.

15. As partes elegem o foro da Comarca de Florianópolis/SC para dirimir eventuais controvérsias oriundas deste instrumento, com renúncia a qualquer outro, por mais privilegiado que seja. E por ser expressão de vontade, firmam o presente contrato de locação de bicicletas, em duas vias de igual teor, nestes termos e na presença de duas testemunhas.`,
  en: `1. All bicycles are the exclusive property of the RENTAL COMPANY and are not insured in any way. In case of accident, theft, robbery, loss, partial or total damage, or any other event that causes damage to the bicycle(s) or their accessories, the RENTER will be solely and fully responsible, committing to reimburse all costs of repair, replacement or acquisition of new equipment, charged according to market price.

2. The minimum rental period is 1 (one) day.

3. To guarantee the rental, the LESSOR may, at its discretion, require a cash deposit or a credit card hold of R$500.00 (five hundred reais), which may be used to cover damages, penalties for breach of contract, cleaning fees, among other things. The amount will be refunded to the LESSEE within 3 (three) business days, or according to the terms of the credit card administrator, after the return of the bicycle(s) and verification of their integrity. If there are any outstanding debts, after deducting the amounts, any remaining balance will be refunded.

4. The LESSEE authorizes the LESSOR to make a copy of 01 (one) identification document during the term of the contract.

5. Subleasing the bicycle(s) to third parties is prohibited; their use is strictly for personal purposes. The use by third parties must be previously authorized and identified, with joint and several liability, according to the addendum to be attached to this contract.

6. The LESSEE agrees to use the bicycle(s) prudently, avoiding falls, impacts and misuse that compromise the functioning of the equipment, as well as to ride it in a way that ensures the safety of third parties.

7. The LESSEE must immediately report any damage, defect or irregularity found, allowing the LESSOR to carry out the repair or replacement, without prejudice to the contracted usage time. Failure to report does not constitute any impediment to the investigation of the facts, ex officio, by the LESSOR or to the issuance of additional charges intended to compensate for any losses arising from this contract.

8. The LESSEE shall not carry out any repairs or authorize any service on the bicycle or accessory without the express prior consent of the LESSOR.

9. In case of destruction, loss, theft or any form of damage to the bicycle(s) or its accessories, the LESSEE shall bear all the costs of repair or acquisition of new equipment. The LESSOR undertakes to present the LESSEE with detailed budgets or proof of expenses that justify the amounts charged, always seeking the market price for equivalent items or services.

10. The RENTER authorizes the use of a GPS tracker on the bicycle and consents to any tracking for the protection of the rented property, as well as the use of the data by the LESSOR in case of accident, theft, robbery, loss, damage, abandonment of the bicycle, or to verify compliance with contractual obligations.

11. The RENTER authorizes, free of charge, the use of their image and voice in photos, videos, and institutional materials of the LESSOR for promotional purposes, and may request revocation in writing. The LESSOR undertakes to cease the use of the RENTERs image and voice in new promotional materials within 30 days of receiving the request. Materials already produced and in circulation before the date of revocation are not subject to this obligation retroactively.

12. In case of non-compliance with any contractual obligations by the LESSEE that do not refer to the delay in returning the bicycle (already covered by the daily rental fee), a penalty of 10% (ten percent) will be applied to the daily rental fee, limited to the equivalent of 5 (five) daily rental fees. This penalty is compensatory in nature and does not prevent the LESSOR from seeking compensation for losses and damages that demonstrably exceed the amount of the penalty, nor from the immediate termination of the contract.

13. Failure to pay will subject the LESSEE to a penalty of 2% (two percent) on the total amount due, interest of 1% (one percent) per month, and monetary correction by the IGP-M/FGV (or index that replaces it), in addition to collection expenses and attorney fees in case of judicial or extrajudicial collection.

14. The parties are bound to the faithful fulfillment of this contract, for themselves, their heirs and successors.

15. The parties elect the jurisdiction of the District of Florianópolis/SC to resolve any disputes arising from this instrument, waiving any other, however privileged it may be. And as an expression of their will, they sign this contract.`,
  es: `1. Todas las bicicletas son propiedad exclusiva de la EMPRESA DE ALQUILER y no están aseguradas. En caso de accidente, robo, hurto, pérdida, daño parcial o total, o cualquier otro evento que cause daños a la(s) bicicleta(s) o a sus accesorios, el ARRENDATARIO será el único y total responsable, comprometiéndose a reembolsar todos los costos de reparación, reemplazo o adquisición de equipo nuevo, cobrados según el precio de mercado.

2. El período mínimo de alquiler es de 1 (un) dia.

3. Para garantizar el alquiler, la EMPRESA DE ALQUILER podrá exigir, a su discreción, un depósito en efectivo o una retención en tarjeta de crédito de R$500,00 (quinientos reales), que podrá utilizarse para cubrir daños, multas por incumplimiento de contrato, gastos de limpieza, entre otros. El importe se reembolsará al ARRENDATARIO en un plazo de 3 (tres) días hábiles, o según los plazos establecidos por el administrador de la tarjeta de crédito, tras la devolución de la(s) bicicleta(s) y la verificación de su integridad. Si existen deudas pendientes, tras deducir los importes, se reembolsará el saldo restante.

4. El ARRENDATARIO autoriza al ARRENDADOR a realizar una copia de un (1) documento de identidad durante la vigencia del contrato.

5. Queda prohibido el subarriendo de la(s) bicicleta(s) a terceros, y su uso es estrictamente para fines personales. El uso por parte de terceros debe ser previamente autorizado e identificado, con responsabilidad solidaria, de acuerdo con la adenda que se adjuntará a este contrato.

6. El ARRENDATARIO se compromete a utilizar la(s) bicicleta(s) con prudencia, evitando caídas, impactos y mal uso que comprometan el funcionamiento del equipo, así como a conducirla de forma que garantice la seguridad de terceros.

7. El ARRENDATARIO deberá informar de inmediato sobre cualquier daño, defecto o irregularidad detectado, permitiendo al ARRENDADOR realizar la reparación o sustitución, sin perjuicio del tiempo de uso contratado. La falta de informe no impide al ARRENDADOR investigar los hechos de oficio ni imponer cargos adicionales para compensar cualquier pérdida derivada de este contrato.

8. El ARRENDATARIO no deberá realizar ninguna reparación ni autorizar ningún servicio en la bicicleta o accesorio sin el consentimiento previo y expreso del ARRENDADOR.

9. En caso de destrucción, pérdida, robo o cualquier tipo de daño a la(s) bicicleta(s) o sus accesorios, el ARRENDATARIO será totalmente responsable de los costes de reparación o adquisición de nuevo equipo. La EMPRESA DE ARRENDAMIENTO se compromete a presentar al ARRENDATARIO presupuestos detallados o comprobantes de gastos que justifiquen los importes cobrados, buscando siempre el precio de mercado para artículos o servicios equivalentes.

10. El ARRENDATARIO autoriza el uso de un rastreador GPS en la bicicleta y consiente cualquier seguimiento para la protección de la propiedad alquilada, así como el uso de los datos por parte de la EMPRESA DE ARRENDAMIENTO en caso de accidente, robo, hurto, pérdida, daños, abandono de la bicicleta o para verificar el cumplimiento de las obligaciones contractuales.

11. El ARRENDATARIO autoriza, de forma gratuita, el uso de su imagen y voz en fotos, vídeos y materiales institucionales de la EMPRESA DE ARRENDAMIENTO con fines promocionales, y podrá solicitar la revocación por escrito. La EMPRESA DE ARRENDAMIENTO se compromete a cesar el uso de la imagen y la voz del ARRENDATARIO en nuevos materiales promocionales en un plazo de 30 días a partir de la recepción de la solicitud. Los materiales ya producidos y en circulación antes de la fecha de revocación no estarán sujetos a esta obligación con carácter retroactivo.

12. En caso de incumplimiento por parte del ARRENDATARIO de cualquier obligación contractual que no se refiera al retraso en la devolución de la bicicleta (ya cubierta por la tarifa de alquiler diario), se aplicará una multa del 10% (diez por ciento) a la tarifa de alquiler diario, limitada al equivalente a 5 (cinco) días de alquiler. Esta multa tiene carácter compensatorio y no impide al ARRENDADOR reclamar una indemnización por daños y perjuicios que superen demostrablemente el importe de la multa, ni la resolución inmediata del contrato.

13. El impago de las cantidades sujetará al ARRENDATARIO a una multa del 2% (dos por ciento) sobre el importe total adeudado, intereses del 1% (uno por ciento) mensual y corrección monetaria según el IGP-M/FGV (o índice que lo sustituya), además de los gastos de cobro y honorarios de abogados en caso de cobro judicial o extrajudicial.

14. Las partes se obligan al fiel cumplimiento de este contrato, en su propio beneficio, así como en el de sus herederos y sucesores.

15. Las partes se someten a la jurisdicción del Distrito de Florianópolis/SC para resolver cualquier controversia derivada de este instrumento, renunciando a cualquier otra jurisdicción, por privilegiada que sea.

Y, como expresión de su voluntad, firman este contrato de alquiler de bicicletas, en dos ejemplares de igual contenido, en estos términos.`,
};
