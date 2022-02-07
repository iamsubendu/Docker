# from base-image:tag/digest
#The <tag> part of the argument is used to 
# specify a version of the image. This means 
# that the instruction FROM ubuntu:14.04 will 
# automatically load the latest available 
# version of Ubuntu 14.04 as the base image. 
# On the other hand, <digest> is more specific 
# as it is used to refer to an exact image which 
# might not be the latest available version. 


# The <image> argument is mandatory when using 
# the FROM instruction, while <tag> or <digest> 
# are optional. If they are not specified, the 
# assumed tag will be :latest and the latest 
# available version of the base image will be 
# used. 

# copy . /app => copy all files from current directory
# to app directory
# CMD node /app/app.js
# CMD is command to run the file
# /app/app.js as app.js will be now in app directory

# so we can add WORKDIR /app
FROM node:alpine
COPY . /app
WORKDIR /app
CMD node app.js


# now to package our application 
# in terminal
# docker build <tag> <name> <path  to find the file+ => . stands for current directory>
# docker build -t practiceDocker .
# use sudo/yum if permission denied

# to check images
# sudo docker images/ docker image ls


# docker run imageName


# to push image 
# sudo docker login
# docker tag imageName:version usrNm/imageName
# thn
# sudo docker push usrName/imageName