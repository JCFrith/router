/*!
 * 413 Solution Field Log - contractor trip invoice PDF.
 *
 * Builds the invoice that goes into the receipts zip: day-by-day contractor pay,
 * itemized receipts, category summary, and the settlement block that separates
 * what is owed to the contractor from total trip cost to 413.
 *
 * Every figure is derived here from the raw fl_trip_days / fl_receipts rows, so
 * this file cannot drift from what the review screen shows.
 *
 *   import { buildInvoicePdf, invoiceFilename } from './invoice-pdf.js';
 *   zip.file(invoiceFilename({trip, days, receipts}), buildInvoicePdf({trip, days, receipts}));
 */
import { jsPDF } from 'https://esm.sh/jspdf@4.2.1';
import autoTable from 'https://esm.sh/jspdf-autotable@5.0.8';


// ---------- brand ----------
var INTEL = [59, 121, 180];    // Intelligence Blue  #3B79B4
var CHAR  = [61, 70, 77];      // Field Charcoal     #3D464D
var BLACK = [10, 10, 10];      // Tactical Black     #0A0A0A
var BG    = [247, 249, 252];   // #F7F9FC
var RULE  = [216, 222, 230];   // #D8DEE6
var MUTED = [107, 118, 128];   // #6B7680
var HILITE= [234, 240, 247];   // #EAF0F7
var WHITE = [255, 255, 255];

var LOGO_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmUAAABkCAYAAADHTEerAAAKOmlDQ1BzUkdCIElFQzYxOTY2LTIuMQAASImdU3dYU3cXPvfe7MFKiICMsJdsgQAiI+whU5aoxCRAGCGGBNwDERWsKCqyFEWqAhasliF1IoqDgqjgtiBFRK3FKi4cfaLP09o+/b6vX98/7n2f8zvn3t9533MAaAEhInEWqgKQKZZJI/292XHxCWxiD6BABgLYAfD42ZLQKL9oAIBAXy47O9LfG/6ElwOAKN5XrQLC2Wz4/6DKl0hlAEg4ADgIhNl8ACQfADJyZRJFfBwAmAvSFRzFKbg0Lj4BANVQ8JTPfNqnnM/cU8EFmWIBAKq4s0SQKVDwTgBYnyMXCgCwEAAoyBEJcwGwawBglCHPFAFgrxW1mUJeNgCOpojLhPxUAJwtANCk0ZFcANwMABIt5Qu+4AsuEy6SKZriZkkWS0UpqTK2Gd+cbefiwmEHCHMzhDKZVTiPn86TCtjcrEwJT7wY4HPPn6Cm0JYd6Mt1snNxcrKyt7b7Qqj/evgPofD2M3se8ckzhNX9R+zv8rJqADgTANjmP2ILygFa1wJo3PojZrQbQDkfoKX3i35YinlJlckkrjY2ubm51iIh31oh6O/4nwn/AF/8z1rxud/lYfsIk3nyDBlboRs/KyNLLmVnS3h8Idvqr0P8rwv//h7TIoXJQqlQzBeyY0TCXJE4hc3NEgtEMlGWmC0S/ycT/2XZX/B5rgGAUfsBmPOtQaWXCdjP3YBjUAFL3KVw/XffQsgxoNi8WL3Rz3P/CZ+2+c9AixWPbFHKpzpuZDSbL5fmfD5TrCXggQLKwARN0AVDMAMrsAdncANP8IUgCINoiId5wIdUyAQp5MIyWA0FUASbYTtUQDXUQh00wmFohWNwGs7BJbgM/XAbBmEEHsM4vIRJBEGICB1hIJqIHmKMWCL2CAeZifgiIUgkEo8kISmIGJEjy5A1SBFSglQge5A65FvkKHIauYD0ITeRIWQM+RV5i2IoDWWiOqgJaoNyUC80GI1G56Ip6EJ0CZqPbkLL0Br0INqCnkYvof3oIPoYncAAo2IsTB+zwjgYFwvDErBkTIqtwAqxUqwGa8TasS7sKjaIPcHe4Ag4Bo6Ns8K54QJws3F83ELcCtxGXAXuAK4F14m7ihvCjeM+4Ol4bbwl3hUfiI/Dp+Bz8QX4Uvw+fDP+LL4fP4J/SSAQWARTgjMhgBBPSCMsJWwk7CQ0EU4R+gjDhAkikahJtCS6E8OIPKKMWEAsJx4kniReIY4QX5OoJD2SPcmPlEASk/JIpaR60gnSFdIoaZKsQjYmu5LDyALyYnIxuZbcTu4lj5AnKaoUU4o7JZqSRllNKaM0Us5S7lCeU6lUA6oLNYIqoq6illEPUc9Th6hvaGo0CxqXlkiT0zbR9tNO0W7SntPpdBO6Jz2BLqNvotfRz9Dv0V8rMZSslQKVBEorlSqVWpSuKD1VJisbK3spz1NeolyqfES5V/mJClnFRIWrwlNZoVKpclTlusqEKkPVTjVMNVN1o2q96gXVh2pENRM1XzWBWr7aXrUzasMMjGHI4DL4jDWMWsZZxgiTwDRlBjLTmEXMb5g9zHF1NfXp6jHqi9Qr1Y+rD7IwlgkrkJXBKmYdZg2w3k7RmeI1RThlw5TGKVemvNKYquGpIdQo1GjS6Nd4q8nW9NVM19yi2ap5VwunZaEVoZWrtUvrrNaTqcypblP5UwunHp56SxvVttCO1F6qvVe7W3tCR1fHX0eiU65zRueJLkvXUzdNd5vuCd0xPYbeTD2R3ja9k3qP2OpsL3YGu4zdyR7X19YP0Jfr79Hv0Z80MDWYbZBn0GRw15BiyDFMNtxm2GE4bqRnFGq0zKjB6JYx2ZhjnGq8w7jL+JWJqUmsyTqTVpOHphqmgaZLTBtM75jRzTzMFprVmF0zJ5hzzNPNd5pftkAtHC1SLSotei1RSydLkeVOy75p+Gku08TTaqZdt6JZeVnlWDVYDVmzrEOs86xbrZ/aGNkk2Gyx6bL5YOtom2Fba3vbTs0uyC7Prt3uV3sLe759pf01B7qDn8NKhzaHZ9Mtpwun75p+w5HhGOq4zrHD8b2Ts5PUqdFpzNnIOcm5yvk6h8kJ52zknHfBu3i7rHQ55vLG1clV5nrY9Rc3K7d0t3q3hzNMZwhn1M4Ydjdw57nvcR+cyZ6ZNHP3zEEPfQ+eR43HfU9DT4HnPs9RL3OvNK+DXk+9bb2l3s3er7iu3OXcUz6Yj79PoU+Pr5rvbN8K33t+Bn4pfg1+4/6O/kv9TwXgA4IDtgRcD9QJ5AfWBY4HOQctD+oMpgVHBVcE3w+xCJGGtIeioUGhW0PvzDKeJZ7VGgZhgWFbw+6Gm4YvDP8+ghARHlEZ8SDSLnJZZFcUI2p+VH3Uy2jv6OLo27PNZstnd8QoxyTG1MW8ivWJLYkdjLOJWx53KV4rXhTflkBMiEnYlzAxx3fO9jkjiY6JBYkDc03nLpp7YZ7WvIx5x+crz+fNP5KET4pNqk96xwvj1fAmFgQuqFowzufyd/AfCzwF2wRjQndhiXA02T25JPlhinvK1pSxVI/U0tQnIq6oQvQsLSCtOu1Velj6/vSPGbEZTZmkzKTMo2I1cbq4M0s3a1FWn8RSUiAZXOi6cPvCcWmwdF82kj03u03GlElk3XIz+Vr5UM7MnMqc17kxuUcWqS4SL+pebLF4w+LRJX5Lvl6KW8pf2rFMf9nqZUPLvZbvWYGsWLCiY6XhyvyVI6v8Vx1YTVmdvvqHPNu8krwXa2LXtOfr5K/KH17rv7ahQKlAWnB9ndu66vW49aL1PRscNpRv+FAoKLxYZFtUWvRuI3/jxa/svir76uOm5E09xU7FuzYTNos3D2zx2HKgRLVkScnw1tCtLdvY2wq3vdg+f/uF0uml1TsoO+Q7BstCytrKjco3l7+rSK3or/SubKrSrtpQ9WqnYOeVXZ67Gqt1qouq3+4W7b6xx39PS41JTelewt6cvQ9qY2q7vuZ8XbdPa1/Rvvf7xfsHD0Qe6Kxzrqur164vbkAb5A1jBxMPXv7G55u2RqvGPU2spqJDcEh+6NG3Sd8OHA4+3HGEc6TxO+PvqpoZzYUtSMvilvHW1NbBtvi2vqNBRzva3dqbv7f+fv8x/WOVx9WPF5+gnMg/8fHkkpMTpySnnpxOOT3cMb/j9pm4M9c6Izp7zgafPX/O79yZLq+uk+fdzx+74Hrh6EXOxdZLTpdauh27m39w/KG5x6mnpde5t+2yy+X2vhl9J654XDl91efquWuB1y71z+rvG5g9cON64vXBG4IbD29m3Hx2K+fW5O1Vd/B3Cu+q3C29p32v5kfzH5sGnQaPD/kMdd+Pun97mD/8+Kfsn96N5D+gPygd1Rute2j/8NiY39jlR3MejTyWPJ58UvCz6s9VT82efveL5y/d43HjI8+kzz7+uvG55vP9L6a/6JgIn7j3MvPl5KvC15qvD7zhvOl6G/t2dDL3HfFd2Xvz9+0fgj/c+Zj58eNv94Tz+8WoiUIAAAAJcEhZcwAACxMAAAsTAQCanBgAABtpSURBVHic7Z0LcB1Xecc/PW3JthwhP7CdOIns4pCEkImMmSYqt0mtS2BDd+nELo8ZhlelTnimPOwozLSdaVwbaEmhkLHpZGjpULAznV3oZlJZQJTxhAEs8IBJA7UNIbETp3aU2JZk69n5Lt9mLooe59y7j7O7/9/MnSvZd6/O3rvn2//5zveomZ6eprxjO9ZfEJET/O65vrXA6+v5ZfLrzzzXvyfCsfkqY0oLWTsfAAAAICxqKefYjvVHIsgmNQ57f9nP/xDBsAAAAACQM3ItymzHupKI7pZfH1Q85k38FPzuuf6ZyAaYTcbKvI0AAAAAyLsosx1rCRF9hogWEdFjnuu7iiLuY/GMMLOMyzN/7gAAAADIsyizHauGiD5BRGuJ6Ckiul9RxN1LRIuJ6FA8IwUAAABAXsilKCOidxDRG4lomIj+znP9Swoi7uNEtI6IniGif4pvqAAAAADIA7kTZbZjdRDRu4iI004/77n+KYXD7iSim4loVETcSAxDBQAAAECOyJUosx1rNRF9Ss77m57r/0jhmBuJ6D0i4u73XP/pWAYLAAAAgFyRG1FmO9YiCexfRkSDRPQNhWNWEtGn5XNyPddHLFn1BFvFDQmPAwAAADCK3IgyIvoQEbUT0XNE9FnP9afme7GUbOglouVE9HPVkhlJF2YNirMaTFAPDqIMAAAAyJsosx3rDiL6E/HS3Oe5/gWFw/6SiF5DRGeJaPdCIg4AAAAAoBoyL8psx7qWiLiNEvNlz/VPKBzTRURvIaIJIvp7z/VfjH6kAAAAAMgzmRZltmO1EhH3peStyO94rv9dxUPvkueveq7/PxEOEQAAAAAg26JMYsJYkL2KiJ4gon/ROLyRiL7vuf5/RThEAAAAAIDsizJpGn4dEQ3JFiRvRc6J7Vjln8WviehL0Q8xl3CtNwZtlgAAAICsizLbsf5YmoYHMWEvKBz2zrKf71uoyj+omCBhAg3JAQAAgCyLMtuxriaij8qvD3qu/wuFY95QLso813820kECAAAAAGRZlEnT8F7ZGnvUc31P4Zg1UuWf+1sCAAAAACRCzfQ0dw+KhhQUMgUpxnN9K+kxAAAAAGGRubiel66+c8tE06oVqq9vfv6HR5vODP422lEBAAAAACToKYsLiQn76wtrb7vm0mXXbFA9btGLTx5feup73ELpk57rHw88eyoemLe852M/PH95cQtFyPTQU79c8ax/XHVMwfjPXnvXW8lMutqe+MqbiYgL+n7Cc/0nkx4QAAAAYAqpjykLYsJGV3RcqSPI6sZeenHpqe/9kogeYEEW7ShBGcEqoC7hcQAAAABGkertS9uxOKD/3vEl69aOruzYqHpczdT42LKnHzlCRI94rt8X7ShB1igUrQ4i4gd3jNgq/9wuj5n0y/OJssfgQN/C7b6SpFAsdcMIzjM4t+Df5jrHQakLyOcX/BsAwBAwr80n1aKMiD4yVd/8muE1t26arqlfrHrQ0lPfP1J36SyLsgeiHR7ICoWitY2ItokIYyOmytY53o9FWb8YvAMDfT4bPRPEZnCOsxnphc7x5XMtFEu77f3yOBC3CC0ULR7LQZXXDvT5xmReF4qWajxJV5w3SNVxzfVZForWDiLaTelk3s/a9GstY/N6eoGXDMr3NZTWuZtaUWY7FheHvfXCuq5rJxtblAP7m84e+WXjuWO8XblroSr/IN/IqrKbiHZoCjEV2uW9mb2FonVAjBw/x0qhaAXnOJunrxq2ymN3oWixEdqDlTYA8ZDTed3B9pSItlNKSWVMme1Y3D7p/SOrb94wvmTdOtXjGoafebb59OP/S0Sf81z//6IdJUgzsrI/Lqv7sAXZbPBKdn+haB0XYxrLORaK1gtixMI23DMpeRPk/PhcAQARgHlN2wpFK61e2fR5ymzH4gbjO8daNr56tO3GTarH1U6MDC892X+UiL7uuf5Pox0lmIcReW4iAykULTZi+zXd/GHSLp4zFmY7o1iBivHcHYPBno3S5ysrbD4/3m4AAFQJ5vXvwcL0xECfv49SRqpEme1YPN57Jhe1XX5h3W036By79OTBI7UTI4/xFhGlkLQX4mUvZctT37677J/+1nYso4rHSuzFwZg8YwsRBOP2h7wdu0MeScMr7MOFosUGfE/SgwEgrWBezwlvrw4aIBCzK8qI6INc4+r8FbffoBPYzwViG4ZPPkFEX/BcP/2F2RagfvT5M1H/jclFrcunaxsaVF5bN/biS+KlNBbDBFnAgZDPb2+CHsD5DCcb8u0mJDsAkCYwr+elVbZWN6TJtqRGlNmOdRsRve38FbdfN9m4nLcwlWg8d+K3TWcGOY7sPs/1h8PySjUSnWl74tjDpEmlhV11isc++oX3raQI6ez1dQTM0GTjZZu/89CBUpbOrbcV/JaWpfzj33iu/2MyZ6VpnCALK7PJUME5W1xKIllTAKQRzGslAtu+mVJCKgL9bacU5/Ph0RUd68eWtV+pehx7aJY89xgXiL3fc/2noh1lPujs9XUFTNehXaXyDyaztwrDNiRbjBy7sHPGY09Z2YtEvGQpMNwBPE4OFjZ9nAAkDua1Fh2FosU2PhUY7ymzHWupFIhdNbLqjdfrFIhd8uzA0dqJkYc81+dYski8UqpxTWmPCatQkPUc2mUZvZ8vLnbdrKETIsL6deIV5G8FNYPm227gANUDhhjuwTJhOTQz8aCsGGW7PG+tItA42G6Axyx7BIuXapmr0OlshBWPadS1iHldEd0S+J90nFu6RZntWOzJ+9RUffMVFy4vvk7n2ObTP/hFw/DJx4nowehGmDt2axjEPYd2WfNlviwhM9AJjh2SmjwVTWwxfKW6PpLlyeKsexZjty/hLdnSeapsoYqRnWnQO+S8Kint0ZG27QawMJIFF8Z1rVOotYsyBuZ1KIH/ptRUS+X25bv4Szy//o4bpuqaWnQajS8eOvoL/hJQIDYcOnv9HRqT8cChXRZv3xmNCKNZK+7PAhuprrBWWmwU+b0G+vwNUuiwP+Sty0oMN58jf28bZGwVbTuz93Cgz+/h96nwRtyR5jpDAEQI5nV1cNkO05Ii0iHKbMfaQkTvuLD2tk0Ti1es1sk8XHrqe4Eg4wJ6oEo6e30WY6qTid3hPHFnpaVl6aNkDjrblpxFFMlWLG9Vyqqexdm+agP8pfCtruHhc9ssRnsoROHJ1wKf21AFdYZUBTMAmQfzOhRapQ6ksbF4Rooy27HWEtEnL7Zev/bSZdewKleiZmp8fNnTD3Nh2Ac912dhBsLJtFQVZDxBtx/aZRkVgzEPyrEpcbi8RZzNKWg1vH+6q1EWgmy4I0nIkM+O57GuqDXaeAIQF5jXodt9LhBuJMaJMtuxFhHRZ8aXrFs78upbrtE5dump7/+0dmLku57re9GNMD9kNNOyHNXAVaNjEGawtwLDXZUQVEFW6V2aBry8PygAeQbzOly2GrCVmg5RRkQfn6pv3ji85tZN0zV1TZqNxvnCuD/a4eWDCDMtJ+W5htLjKTM6gzRAtgW2mma4qzTgvN0BbxnILZjXkcFjSFocmi3KbMeyiehNw2sKfzDZ2LJCs9H4z6RA7KVoR5kbwsy0LOeiPDdXOC4QTiZpELQbK2LAOXZOdYubDbdxhhOAGMG8jo69pgX+GyPKbMfiGmQfGFl984axZVdfpXpc7cTIyNKT/T+XFkony97Pz0JtsCTIYqZllRg1aUPKJGUDmggS46JzzZhgvAGIHczrWDhogNfOLFFmO1YbNxofa9m4erTtxk06BWKXnjzIcWTf8Fz/B9GOMh+EmWmZAlTj39KQBahj4CpOiw+5bpVqrF57oWjpFvgFIAtgXkdPq0nCLHFRZjsWF7C9Z6q+eeWFdbfdoHNs05mf/Kph+CSXWPh6dCPMDxnPtKxKlEk6usmoGrehMIp4hoROzbc0CGMAwgbzujLYY6dzb9K592W+oj+vBF577qq33zRdU79Ys9E4e2o+57n+1Fyvq2QLM4/bnjnItJyNfg2jwNWgycQ2HbLF0a4RBGyEkOaUeq6wrbg9DFEGcgXmdVUMijDbm7ZWTImKMtspZZVY56+4/brJxuW8hancaHzZM48cIaJdnuu/NN9rx5esWz5d19Sg8r6N546dIUPREYq6onKqvrmh7ipny2TjZctV68E1XHj6P7t67httuPDUmYbhk/N+B3Nwl+1Yd1GVqPYeDanUBQszXrnuNKxVh1ZmFpnFPkXDyVsd7UlvzwAQI5jXVW6lypbkbk0bH0rv4dSJMtuxuOjcXaMrOtaPLWu/Uq9A7H9zgdgHPNf/1UKvP7f+bWNUU3uLynu3PXHsYfnxzxVe/i3KCBPNa5erCjJmurahYaylfT3/zDGAItKeXXTu2HMmC9uZcIV+noCajXZLPdzkuH0qfeRMKu1hwFhnckBjNbvVwJsPAFGBeV0l7PWS7MptmhmZLMwGcyPKbMdaRkT3ji9Zt2p05Wbliv1M8+kfHK27dNb1XP8RpQNqaoO6WMp4rn9hodfYTjUOmmg8QoGHTNd71NnrKzf5nU+k/U6oFU/MVyLDdqz3ygT5mucmtxopY2eF1Z2DCtullZUYoUGp/h/3NkJqi+DyZ6Wx1WFEIC4AMYF5HQ498ll2aLZi6kpiSzj2QH/bsfhvfnqqvvny85e/+XrdArGLh44eYi9ZtKMEVcAX/97OXv9gZ6+v44FKBHFTV2vU+Dx3iLh7oVC0DnO1aN7qjCmjZ2vKi+Cqfv6IKwN5AvM6mRpqibZiSiL78t1EdNP59XfcMF23eLlOo/Hm048fkQKxY9EOEYQAT7TD4oUzne0hG7aOuUQaJYsRgcApGhcAacDU+WPMuAZ+t72rW8ONs+5121ulS5TZjvWHHK81vPqWqycWr1itUyB22dMPB5mWp6MdJQiRUkan1D4zlgrbhFQk0gpFa5onelgCTacatWHJCeUMZqWILwBhgHkdPvI56dbV5IzM7kyKMtux1hHR3Rdbr197se31r9U5VgrE/qvnJhN4B6pmt9RAY8YMKscymzCLw8B1i0BjLxr3X6tmmzdPcVZ5OleQb/J0rbfGXNx2n8mtmGIRZbZjcf2xeycXta0cefUt1+gcy3FkDcMnOQj9m9GNEMQw6fZLLbRx+bdFZBgszAb6/C5ZTcXheg/StY+L9yxPhhgAAGJn4He9QXUdPJxx354JUWY7Vg17yKbqmzeev+ItWoH9XCC2+fTjHNj/ec/1p6Mdaa7hC7RrgQdnKXJRvUq9lXxBG72NOWM1tUHOOa5U824RZ0nHnQEAQNbp0rTtJcdCHAvnOLaQHK66MLymsHGysWWFToHYJc899jMJ7B+Odoj5RlolLbRt9/L/S1blNomT0rlId0wuavuruktnyXRkO5NFKNe5YcHECQtRC6Zg4nN17p60BdPGQJ7OFeSbPF3rQwmV7Niu2cUmaMXUk1pPme1YryOi9w+vvqV9bNnVV6sex8VIlzw7cLR2YuQfPdf/dZRjBPpwe6VDu6w94k3SicFqHV59cxqyMX8P9pwN9Pk8gV8lE/JAxIakWzXrR6fAYaFY6qCR6iKZEY8DACPAvI7tM+bdEF3bvCOVnjLbsdgrds/4knWtF9terxdHduYnHEfG5QR+bDvW0qoGMj1VRzV62lPnb858rUrh2Yx52Lo6e/39ql6kiaaVnIH7JKUQ8Z69HCgqxpANDz+HbRij6MNmasyaqeMCIA2YOn9MHZfRrZjqo2zMzT0Vz6/Xy1rgemQ1k6NPjrVs5Hpm/KiKuvFzmyYbL1N67VjLxmB79bvzva5mcnS8rN/jt2ar9F9lT8bYel+GNM4eESULTsLpusXtIsoaKeVIijU/SsJJMnTKhVq1Roknv0obJ9XG6jwuE7oozERV0Jqa+g9AFGBex4C0YtKNeY6sFVOkMWXnrnK2TNfUc+alMhNNq1ZMNK26kxLg/OXFLarCcfmvH/pR9CNKj8ess7fk0dmtKn4bzx0zqiRGGMgEfXmSiictiEWrNHNnt0LRQ9WAVeO2OWSVqrpwy1OcjTFeCGQFJwbmdXzslPF2aMb/bg67FVN9VF6Urp77ntRpcp0mJppWcWeBSDxiSfS+DAnl1c5U3eIGygFlnrSd4kXrriADlVs1tS/gLVMu0qjwXnGjkzyRB0+Zar/AOFuYGR0blGEwr+MP/D+sseDhObhfMjlT3WYJZJBDu0rNZ5WYamxpppzBXjTJqNRNjlAxcDrvZ1pZEtXxnDDsphMVqqvuOL1XrSnyeGQJzOsYkXF0Jd2KCaIMgJgnvhSo3ReWp0KMyQmNBAIjtqPKEiVSsZrOY2saTa8cPGUhgnmdWAhKoq2YIMoASADxmvWHeFNUDfRtNWhVrZNabpTxjpAhA+OIVP8WPGXhg3kdM5W2Ygrr70OUgVAo6225ILVj50aISCsBJKOoTnyVz1bHiFTbb7NqpHOB6s0+svRzA9GpTxV59wfxvqh+T/CUhQ/mtfmL5lCBKMuwSJJek3GhvHKvnbzI/S/rKOeEaZBkq6NfJ3OIEkJuHDorS91Va9qTQ8ggb9m2iMYOFMC8ThQO/I893g2iLLtwKYXDOh6sShHxp+yybjx37Ey0I8otOoVmO8IOUNXwvOzXDB433XiHzQGNWJaoPSOq8xqCLDowrxNASl1sj3tbHqIsg7z5fZ/aL6vodhFmuyP2mrERUHr/2vELj5JhJNUEXOOGekKzBEfo7ZxCNNzca05nobAn7DpAKUBnG1CnErkWEryseo1ClEUE5nXqAv/NrOjfTHS8+fTjxxOqmfXy2M9ee9dbVY9pe+IrD1f6d2aS1Hkzoyu3WLOsdrulwOs+aY9UNSL0ePIri5q6sSG+yF9LhiDCiIsAstHriTk9Wzn2QuM92YAc1zTgQQyFaYb7hOmr6YjYpyG2uI5dtwQnhz0vdASfkbFBGQLzOsEwk0LR2hnlAqgceMoyxuiKjvVT9c2z1QEL+nu90Nnr7+3s9avyDnX2+t1SaE/nfYaan//RAJnFtjKBdJibzcaRWi5/I/StIRGVlTTZPRzVVpikyPMNRXcrvScNq+kIe6zqtOPqSHArap8ptaayCuZ1skgP4liEZGQV/avtm5kkKaie/wpsx1rGvUZHV9y0SeHlpcrynb2lUwhc46WaOHMVgZXYtPaytkGVCJc99aOnn5efmyhhZhFGgXBlYVaahBEaj91RbQ1JL7dtmsaSX3s4zPOWm0HJS1vB4by9kectsX0an1urfHd8s6vqxiHijgWZzo0cXrIYwLxOXSumishc/8Ec032x7cb107UNui2Mgv6MJUSoRQELvj2285U3GOSlnUtcBuKMPRB8k+sPK1NSbnp7dVrXVNj0VrdlyGyiVKUZ+iuooqVU+TnregUyBX/ncu3pNkneVsmNr4ob7YEU32TTCOZ1sq2YusQ7GNluCkRZBrAda/PkorY7LrZel2iNmnkIslhMQ2X7sGSECsVSHB4Ls0FdoSQ3vMDDuDXCzKuXYaMrBuRgBQakXJTyefJNl5+HZt6AyxoPt8tzkGBSKYNh95JbiELR4s8oTlRvTnsq8EqXFlmFonWi7Ho9MfN6lWuy/DurpLwGz4nU3mTTCOa1McKMhXEkQJSlHNuxlhDRRy5dtmlNBV6yuNip0xszDjQzy15RMZuDaMu2FWfzFJQbtUqNWVUeOvG2VGrAA37PXS/nHRV8k+9KIN4kzur4ujfgngprTwWeryi/N/bIIZYsZjCvjfj8eV5GkuFqwhYSqI4PEtGK5tOPf5to+h4yj55Du0rbMKYRRhmMwMOwe5bHjipXl2zAqs6cEg8JG3DTDSKPc3NWDHdYiCg3cf5wfFJFXlxQPZjXySKxm5Fc/xBlKcZ2rJtkYo4R0f2Hdt3BYmCDIYG3pdWRiYJMXPNGNO+dh66wvBBlBtwob2UZ/WGeb9aQsgb7DBNksdZuAq8E8zpZJAQh9HhKiLIK4azLJDMvbcfi7MUPE1ENEf2b5/qn+N8P7bI4oH67TNakxBnfQDYc2lWq/TUT7nvJzFa2IxZk1Zbk56Pi6h+MyICbdHNndg70+ZnZ2siBMIMgMwjM68The22othqiLL28l4hWE9GTrBFn/icLIhFnG8TNGsdq5YB4x3jL0ujJyMZioM/fbthKs2Rgo8pmk3PuSaqn2wz6ZVsDW2CKyHfHq/OhBG+0EGSGgXmdHCI6e8KckxBlKcR2rNcREXvpuLH3Fz3Xn5rrteI540B7Fmebxaj3hywkdopnbPsc3jFjYQE00OdvFoOW1NiDLLbQPWRzxSkN9PkbErrB801ju6yiTRHDqUFudl0xX6u5utGmFczrbLRiQvZlyrAdazERfUy2Lf/Dc/2nVI+VDEh+lIxrZ6+/VTJwgkzB+TLRSsVlZbKX0uzZWJvuEdMMqOZ2Gh2SBMCPqEuMBJXbE6mILjdZLkjZLYkJ7RHf2Pk8TdwyTuWWlVRUDxJKomBQvjPTtsbAPGBep7sVU8309DRFQZor+oN0EHVMnwi0IMNya4hCLOiiwCtbY0RtmSANxHq1lJ9nrKJTBEvc9cdUYe9saDWbpOZYd0gLiaC+GY/ROK+3zvc60OfzwjWXY8rwvJ5WfGlkYSDzIY3gu6sZG0QZSC1xJ1qIcQs8i+X1x2YTbIFHkekPfk+La7+seGR5rbVyj2o5gYEZLDtP427oeUAEWnlLNCq7ZmfSn9brE1QG5rX5RCbKkqaS3pRR9rOs9L3LxO3biehLRHS5bFv+O6UQ27GuIqIvE9FvPNf/UNLjAQAAAEwBgf7p4d0iyH5DRN9MejAAAAAACBeIsvTwZ0Q0SURf8Fx/IunBAAAAACBcIMrS9V095Ln+saQHAgAAAIDwgShLD89wLFnSgwAAAABANECUGYztlDKpAnjbkovFph3egmVw7QEAAABl4MZoKLZj1RHR3cHvnutzO6UscFGeuXcnAAAAAASIMnO5M4aK8gAAAAAwBIgyA7Ed60oieicRZbOIHAAAAABeAUSZYdiOxd/Jx4mogYjQFQEAAADICRBlZtYjew0RnSairyU9GAAAAADEA0SZQdiOtVYq9/O25Rc91x+l7BFkX3IiAwAAAAAEiDJDsB2rRrYtG4noEc/1j1A2uSTPixIeBwAAAGAUEGXm8KdEdB0RnSGiB5MeDAAAAADiBaLMAGzHWkNE75Ffv+S5/kjCQwIAAABAzECUmbFt+VEiWkxE/Z7rH056TAAAAACIH4iy5LmdiG4goheI6KtJDwYAAAAAyQBRliC2Y60kog/Ir//suf4Fyj5B/06uwwYAAAAAAaIsWT4qPSAf81z/h5QDPNcfkx85yxQAAAAAQn3wA0iE/UTUTEQPJD0QAAAAACQLRFmCeK7/cyL6RNLjAAAAAAAlzv8DwCPKQV797S0AAAAASUVORK5CYII=';
var LOGO_W_PT = 148, LOGO_H_PT = 148 * 100 / 613;

var M = 43.2;                  // 0.6in margin
var PAGE_W = 612, PAGE_H = 792;
var CW = PAGE_W - 2 * M;       // content width

var CATEGORY_ORDER = ['Air fare', 'Rental car', 'Gas', 'Misc transportation', 'Hotel', 'Misc'];

// ---------- helpers ----------
function money(n) {
  var v = Number(n) || 0;
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// Parse a plain YYYY-MM-DD as a LOCAL date. new Date("2026-08-03") is UTC
// midnight and renders as Aug 2 in any negative-offset timezone.
function d(s) {
  if (s instanceof Date) return s;
  if (!s) return null;
  var p = String(s).slice(0, 10).split('-');
  if (p.length !== 3) return new Date(s);
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function pad(n) { return (n < 10 ? '0' : '') + n; }
function mdy(x) { var t = d(x); return t ? pad(t.getMonth()+1)+'/'+pad(t.getDate())+'/'+t.getFullYear() : ''; }
function longd(x) { var t = d(x); return t ? MON[t.getMonth()]+' '+t.getDate()+', '+t.getFullYear() : ''; }
function dowd(x) { var t = d(x); return t ? DOW[t.getDay()]+', '+MON[t.getMonth()]+' '+pad(t.getDate())+', '+t.getFullYear() : ''; }
function titleCase(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------- derive every number from the raw rows ----------
function compute(data) {
  var trip = data.trip || {};
  var days = (data.days || []).slice().sort(function (a, b) {
    return String(a.work_date).localeCompare(String(b.work_date));
  });
  var receipts = (data.receipts || []).slice().sort(function (a, b) {
    return String(a.receipt_date).localeCompare(String(b.receipt_date)) ||
           String(a.category).localeCompare(String(b.category)) ||
           String(a.vendor).localeCompare(String(b.vendor));
  });

  var rate = Number(trip.day_rate) || 0;
  var dayPay = days.length * rate;

  var card = 0, oop = 0, byCat = {};
  receipts.forEach(function (r) {
    var amt = Number(r.amount) || 0;
    var personal = r.paid_with === 'Personal';
    if (personal) { oop += amt; } else { card += amt; }
    var c = byCat[r.category] || (byCat[r.category] = { card: 0, oop: 0 });
    if (personal) { c.oop += amt; } else { c.card += amt; }
  });

  return {
    trip: trip, profile: data.profile || {}, days: days, receipts: receipts,
    rate: rate, dayPay: dayPay, card: card, oop: oop,
    owed: dayPay + oop, tripCost: dayPay + card + oop,
    byCat: byCat,
    invoiceNo: 'FL-' + String(trip.id || '').slice(0, 8).toUpperCase(),
    issued: new Date()
  };
}

// The review app reads the contractor off the fl_trip_summary view; the
// contractor app has an fl_profiles row. Accept either shape.
function contractorName(profile, trip) {
  var p = profile || {}, t = trip || {};
  var n = p.full_name || t.contractor_name || p.email || t.contractor_email || 'Contractor';
  // full_name is defaulted to the email address by the fl_new_user trigger
  if (n.indexOf('@') > -1) n = titleCase(n.split('@')[0]);
  return n;
}
function contractorEmail(profile, trip) {
  var p = profile || {}, t = trip || {};
  return p.email || t.contractor_email || '';
}

// ---------- drawing primitives ----------
function setFill(doc, c) { doc.setFillColor(c[0], c[1], c[2]); }
function setText(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
function setDraw(doc, c) { doc.setDrawColor(c[0], c[1], c[2]); }

function sectionHeader(doc, y, label) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); setText(doc, INTEL);
  doc.text(String(label).toUpperCase(), M, y);
  setDraw(doc, INTEL); doc.setLineWidth(1.1);
  doc.line(M, y + 4, M + CW, y + 4);
  return y + 16;
}

function footer(doc, invoiceNo) {
  var n = doc.getNumberOfPages();
  for (var i = 1; i <= n; i++) {
    doc.setPage(i);
    setDraw(doc, RULE); doc.setLineWidth(0.5);
    doc.line(M, PAGE_H - 45, PAGE_W - M, PAGE_H - 45);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); setText(doc, MUTED);
    doc.text('413 Solution LLC  |  Murfreesboro, TN  |  413solution.com', M, PAGE_H - 33);
    doc.text('Invoice ' + invoiceNo + '  |  Page ' + i + ' of ' + n, PAGE_W - M, PAGE_H - 33, { align: 'right' });
  }
}

var TABLE_BASE = {
  theme: 'plain',
  margin: { left: M, right: M, bottom: 62 },
  styles: { font: 'helvetica', fontSize: 8.6, cellPadding: { top: 5, bottom: 5, left: 7, right: 7 },
            textColor: CHAR, lineColor: RULE, lineWidth: 0 },
  headStyles: { fillColor: CHAR, textColor: WHITE, fontStyle: 'bold', fontSize: 8.4 },
  alternateRowStyles: { fillColor: BG },
  bodyStyles: { fillColor: WHITE }
};

// ---------- main ----------
function build(data, opts) {
  opts = opts || {};
  var doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  var table = function (o) { return autoTable(doc, o); };
  var v = compute(data);
  var name = contractorName(v.profile, v.trip);

  doc.setProperties({
    title: '413 Solution Contractor Invoice ' + v.invoiceNo,
    author: '413 Solution LLC',
    subject: (v.trip.name || 'Trip') + ', ' + name
  });

  // --- header ---
  var y = M;
  try { doc.addImage(LOGO_PNG, 'PNG', M, y, LOGO_W_PT, LOGO_H_PT); } catch (e) {}
  doc.setFont('helvetica', 'bold'); doc.setFontSize(19); setText(doc, BLACK);
  doc.text('CONTRACTOR INVOICE', PAGE_W - M, y + 17, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setText(doc, MUTED);
  doc.text('Invoice ' + v.invoiceNo + '  |  Issued ' + longd(v.issued), PAGE_W - M, y + 32, { align: 'right' });
  y += 52;

  // --- meta strip ---
  var metaH = 46;
  setFill(doc, BG); setDraw(doc, RULE); doc.setLineWidth(0.6);
  doc.rect(M, y, CW, metaH, 'FD');
  var cols = [
    ['CONTRACTOR', [name, contractorEmail(v.profile, v.trip)]],
    ['TRIP', [v.trip.name || '']],
    ['TRIP DATES', [mdy(v.trip.start_date) + ' - ' + mdy(v.trip.end_date)]],
    ['STATUS', [titleCase(v.trip.status || '')]]
  ];
  var widths = [0.30, 0.26, 0.24, 0.20], cx = M;
  cols.forEach(function (col, i) {
    var w = CW * widths[i];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2); setText(doc, MUTED);
    doc.text(col[0], cx + 10, y + 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); setText(doc, CHAR);
    col[1].forEach(function (line, j) {
      if (!line) return;
      doc.text(doc.splitTextToSize(String(line), w - 20)[0], cx + 10, y + 28 + j * 11);
    });
    cx += w;
  });
  y += metaH + 14;

  // --- hero ---
  var heroH = 84;
  setFill(doc, BLACK); doc.rect(M, y, CW, heroH, 'F');
  setFill(doc, INTEL); doc.rect(M, y, 3, heroH, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(154, 166, 178);
  doc.text('OWED TO CONTRACTOR', M + 18, y + 21);
  doc.setFontSize(30); setText(doc, WHITE);
  doc.text(money(v.owed), M + 18, y + 51);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6); doc.setTextColor(185, 196, 207);
  var blurb = money(v.dayPay) + ' day pay plus ' + money(v.oop) + ' reimbursable out of pocket. ' +
              money(v.card) + ' charged to the 413 card is a company expense and is not reimbursed to the contractor.';
  doc.text(doc.splitTextToSize(blurb, CW - 36), M + 18, y + 66);
  y += heroH + 18;

  // --- contractor pay ---
  y = sectionHeader(doc, y, 'Contractor pay');
  var payBody = v.days.map(function (row, i) {
    return [String(i + 1), dowd(row.work_date), 'Field data collection, 1 day', money(v.rate), money(v.rate)];
  });
  payBody.push([
    { content: '', styles: { fillColor: WHITE } },
    { content: '', styles: { fillColor: WHITE } },
    { content: 'Total day pay  (' + v.days.length + ' days at ' + money(v.rate) + ')',
      styles: { fontStyle: 'bold', fillColor: WHITE } },
    { content: '', styles: { fillColor: WHITE } },
    { content: money(v.dayPay), styles: { fontStyle: 'bold', halign: 'right', fillColor: WHITE } }
  ]);
  table(Object.assign({}, TABLE_BASE, {
    startY: y,
    head: [['#', 'Work date', 'Description', 'Rate', 'Amount']],
    body: payBody,
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 112 },
      2: { cellWidth: CW - 25 - 112 - 65 - 79 },
      3: { cellWidth: 65, halign: 'right' },
      4: { cellWidth: 79, halign: 'right' }
    },
    didParseCell: function (h) { if (h.section === 'head' && h.column.index >= 3) h.cell.styles.halign = 'right'; },
    willDrawCell: function (h) {
      if (h.section === 'body' && h.row.index === payBody.length - 1 && h.column.index === 0) {
        setDraw(doc, CHAR); doc.setLineWidth(1);
        doc.line(M, h.cell.y, M + CW, h.cell.y);
      }
    }
  }));
  y = doc.lastAutoTable.finalY + 10;
  if (v.trip.stores_completed != null) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); setText(doc, MUTED);
    doc.text('Stores completed on this trip: ' + v.trip.stores_completed +
             '. Stores completed is recorded for reporting only and does not affect pay, which is a flat day rate.', M, y);
    y += 16;
  }

  // --- itemized expenses ---
  y = sectionHeader(doc, y, 'Itemized expenses');
  var expBody = v.receipts.map(function (r) {
    var vend = r.vendor || '';
    if (r.note) vend += '\nNote: ' + r.note;
    return [mdy(r.receipt_date), vend, r.category || '', r.paid_with || '', money(r.amount)];
  });
  expBody.push([
    { content: '', styles: { fillColor: WHITE } },
    { content: 'Total expenses  (' + v.receipts.length + ' receipt' + (v.receipts.length === 1 ? '' : 's') + ')',
      styles: { fontStyle: 'bold', fillColor: WHITE } },
    { content: '', styles: { fillColor: WHITE } },
    { content: '', styles: { fillColor: WHITE } },
    { content: money(v.card + v.oop), styles: { fontStyle: 'bold', halign: 'right', fillColor: WHITE } }
  ]);
  table(Object.assign({}, TABLE_BASE, {
    startY: y,
    head: [['Date', 'Vendor', 'Category', 'Paid with', 'Amount']],
    body: expBody,
    columnStyles: {
      0: { cellWidth: 61 },
      1: { cellWidth: CW - 61 - 72 - 61 - 79 },
      2: { cellWidth: 72 },
      3: { cellWidth: 61 },
      4: { cellWidth: 79, halign: 'right' }
    },
    didParseCell: function (h) {
      if (h.section === 'head' && h.column.index === 4) h.cell.styles.halign = 'right';
      if (h.section === 'body' && h.column.index === 1 && typeof h.cell.raw === 'string' &&
          h.cell.raw.indexOf('\nNote: ') > -1) {
        h.cell.styles.fontSize = 8.6;
      }
    },
    willDrawCell: function (h) {
      if (h.section === 'body' && h.row.index === expBody.length - 1 && h.column.index === 0) {
        setDraw(doc, CHAR); doc.setLineWidth(1);
        doc.line(M, h.cell.y, M + CW, h.cell.y);
      }
    }
  }));
  y = doc.lastAutoTable.finalY + 18;

  // --- category summary ---
  if (y > PAGE_H - 200) { doc.addPage(); y = M; }
  y = sectionHeader(doc, y, 'Expense summary by category');
  var seen = {}, catRows = [];
  CATEGORY_ORDER.forEach(function (c) {
    if (v.byCat[c]) { seen[c] = 1; catRows.push([c, money(v.byCat[c].card), money(v.byCat[c].oop), money(v.byCat[c].card + v.byCat[c].oop)]); }
  });
  Object.keys(v.byCat).forEach(function (c) {   // any category not in the known list
    if (!seen[c]) catRows.push([c, money(v.byCat[c].card), money(v.byCat[c].oop), money(v.byCat[c].card + v.byCat[c].oop)]);
  });
  catRows.push([
    { content: 'Total', styles: { fontStyle: 'bold', fillColor: WHITE } },
    { content: money(v.card), styles: { fontStyle: 'bold', halign: 'right', fillColor: WHITE } },
    { content: money(v.oop), styles: { fontStyle: 'bold', halign: 'right', fillColor: WHITE } },
    { content: money(v.card + v.oop), styles: { fontStyle: 'bold', halign: 'right', fillColor: WHITE } }
  ]);
  table(Object.assign({}, TABLE_BASE, {
    startY: y,
    head: [['Category', '413 card', 'Out of pocket', 'Total']],
    body: catRows,
    columnStyles: {
      0: { cellWidth: CW - 3 * 90 },
      1: { cellWidth: 90, halign: 'right' },
      2: { cellWidth: 90, halign: 'right' },
      3: { cellWidth: 90, halign: 'right' }
    },
    didParseCell: function (h) { if (h.section === 'head' && h.column.index > 0) h.cell.styles.halign = 'right'; },
    willDrawCell: function (h) {
      if (h.section === 'body' && h.row.index === catRows.length - 1 && h.column.index === 0) {
        setDraw(doc, CHAR); doc.setLineWidth(1);
        doc.line(M, h.cell.y, M + CW, h.cell.y);
      }
    }
  }));
  y = doc.lastAutoTable.finalY + 18;

  // --- settlement ---
  var setRows = [
    ['Day pay owed to contractor', money(v.dayPay), 0],
    ['Out-of-pocket expenses owed to contractor', money(v.oop), 0],
    ['AMOUNT PAYABLE TO CONTRACTOR', money(v.owed), 1],
    ['Expenses already charged to the 413 card', money(v.card), 0],
    ['TOTAL TRIP COST TO 413 SOLUTION', money(v.tripCost), 2]
  ];
  var rowH = 22, setH = setRows.length * rowH;
  if (y + setH + 96 > PAGE_H - 62) { doc.addPage(); y = M; }
  y = sectionHeader(doc, y, 'Settlement');
  setDraw(doc, RULE); doc.setLineWidth(0.5);
  doc.rect(M, y, CW, setH, 'S');
  setRows.forEach(function (r, i) {
    var ry = y + i * rowH;
    if (r[2] === 1) { setFill(doc, HILITE); doc.rect(M + 0.5, ry, CW - 1, rowH, 'F'); }
    if (r[2] === 2) { setFill(doc, BG); doc.rect(M + 0.5, ry, CW - 1, rowH, 'F'); }
    if (r[2]) { setDraw(doc, CHAR); doc.setLineWidth(1); doc.line(M, ry, M + CW, ry); }
    doc.setFont('helvetica', r[2] ? 'bold' : 'normal');
    doc.setFontSize(r[2] ? 9 : 8.6);
    setText(doc, r[2] ? BLACK : CHAR);
    doc.text(r[0], M + 10, ry + 14);
    doc.text(r[1], M + CW - 10, ry + 14, { align: 'right' });
  });
  y += setH + 10;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); setText(doc, MUTED);
  doc.text(doc.splitTextToSize(
    'Expenses paid on the 413 company card are settled directly by 413 Solution and are shown here for trip ' +
    'accounting only. They are not part of the amount payable to the contractor.', CW), M, y);
  y += 26;

  // --- approval ---
  if (y + 70 > PAGE_H - 62) { doc.addPage(); y = M; }
  y = sectionHeader(doc, y, 'Approval');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); setText(doc, MUTED);
  doc.text('Contractor', M, y + 4);
  doc.text('Approved by, 413 Solution', M + CW * 0.44, y + 4);
  setDraw(doc, CHAR); doc.setLineWidth(0.7);
  doc.line(M, y + 34, M + CW * 0.40, y + 34);
  doc.line(M + CW * 0.44, y + 34, M + CW, y + 34);
  doc.setFontSize(8.6); setText(doc, CHAR);
  doc.text(name + '     Date: ______________', M, y + 46);
  doc.text('Name: ____________________   Date: ____________', M + CW * 0.44, y + 46);

  footer(doc, v.invoiceNo);

  // jsPDF 4.x returns null for output('uint8array'); arraybuffer is reliable.
  if (opts.output && opts.output !== 'uint8array') return doc.output(opts.output);
  var ab = doc.output('arraybuffer');
  return new Uint8Array(ab);
}

function filename(data) {
  var v = compute(data);
  var name = contractorName(v.profile, v.trip).replace(/[^A-Za-z0-9]+/g, '');
  var trip = String(v.trip.name || 'Trip').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return '413_Invoice_' + v.invoiceNo + '_' + name + '_' + trip + '.pdf';
}

export { build as buildInvoicePdf, filename as invoiceFilename, compute as invoiceTotals };
